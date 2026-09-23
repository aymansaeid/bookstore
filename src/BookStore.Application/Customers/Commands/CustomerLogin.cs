using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auth;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Auth;
using BookStore.Domain.Auth;
using FluentValidation;

namespace BookStore.Application.Customers.Commands;

/// The refresh token travels back to the Api layer here so it can be set as
/// an HttpOnly cookie. It never reaches the JSON response body.
public sealed record CustomerLoginResult(CustomerAuthResponse Response, string RefreshToken, DateTimeOffset RefreshExpiresAtUtc);

public sealed record CustomerLoginCommand(string Email, string Password) : ICommand<CustomerLoginResult>;

public sealed class CustomerLoginCommandValidator : AbstractValidator<CustomerLoginCommand>
{
    public CustomerLoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
        RuleFor(x => x.Password).NotEmpty().MaximumLength(PasswordRules.MaxLength);
    }
}

public sealed class CustomerLoginCommandHandler(
    ICustomerRepository customerRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IPasswordHasher passwordHasher,
    ITokenHasher tokenHasher,
    ICustomerTokenGenerator tokenGenerator,
    IUnitOfWork unitOfWork)
    : ICommandHandler<CustomerLoginCommand, CustomerLoginResult>
{
    public static readonly TimeSpan RefreshTokenValidity = TimeSpan.FromDays(30);

    public async Task<Result<CustomerLoginResult>> Handle(CustomerLoginCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByEmailAsync(command.Email.Trim().ToLowerInvariant(), ct);

        // Same constant-time dance as admin login: verify even when the
        // customer is null so timing doesn't leak which emails exist.
        var verification = passwordHasher.Verify(customer?.PasswordHash, command.Password);

        if (customer is null || customer.IsAnonymized || verification == PasswordVerification.Failed)
            return Result.Failure<CustomerLoginResult>(CustomerErrors.InvalidCredentials);

        if (!customer.IsActive)
            return Result.Failure<CustomerLoginResult>(CustomerErrors.AccountUnavailable);

        if (!customer.IsEmailVerified)
            return Result.Failure<CustomerLoginResult>(CustomerErrors.EmailNotVerified);

        if (verification == PasswordVerification.SuccessRehashNeeded)
            customer.ChangePasswordHash(passwordHasher.Hash(command.Password));

        customer.RecordLogin();

        var generated = tokenHasher.Generate();
        refreshTokenRepository.Add(RefreshToken.Create(
            customer.Id, generated.TokenHash, Guid.NewGuid(), RefreshTokenValidity));

        await unitOfWork.SaveChangesAsync(ct);

        var accessToken = tokenGenerator.Generate(customer);

        return Result.Success(new CustomerLoginResult(
            new CustomerAuthResponse(accessToken.Token, accessToken.ExpiresAtUtc, customer.ToProfileDto()),
            generated.PlainToken,
            DateTimeOffset.UtcNow.Add(RefreshTokenValidity)));
    }
}