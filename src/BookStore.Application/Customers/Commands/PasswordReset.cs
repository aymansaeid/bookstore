using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auth;
using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Auth;
using BookStore.Application.Common;
using BookStore.Application.Emails;
using BookStore.Domain.Auth;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Customers.Commands;

public sealed record RequestPasswordResetCommand(string Email) : ICommand;

public sealed class RequestPasswordResetCommandValidator : AbstractValidator<RequestPasswordResetCommand>
{
    public RequestPasswordResetCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
    }
}

public sealed class RequestPasswordResetCommandHandler(
    ICustomerRepository customerRepository,
    ISecurityTokenRepository tokenRepository,
    ITokenHasher tokenHasher,
    IEmailSender emailSender,
    IUnitOfWork unitOfWork,
    IOptions<StoreOptions> storeOptions)
    : ICommandHandler<RequestPasswordResetCommand>
{
    private static readonly TimeSpan ResetValidity = TimeSpan.FromMinutes(30);

    public async Task<Result> Handle(RequestPasswordResetCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByEmailAsync(command.Email.Trim().ToLowerInvariant(), ct);

        // Same response either way. Silence for unknown addresses.
        if (customer is null || !customer.IsActive || customer.IsAnonymized)
            return Result.Success();

        // Invalidate outstanding reset tokens: requesting a new link should
        // make the previous one dead, not leave several live at once.
        await tokenRepository.InvalidateAllAsync(customer.Id, SecurityTokenPurpose.PasswordReset, ct);

        var generated = tokenHasher.Generate();
        tokenRepository.Add(SecurityToken.Create(
            customer.Id, generated.TokenHash, SecurityTokenPurpose.PasswordReset, ResetValidity));

        await unitOfWork.SaveChangesAsync(ct);

        await emailSender.SendAsync(
            CustomerEmailTemplates.PasswordReset(customer, generated.PlainToken, storeOptions.Value), ct);

        return Result.Success();
    }
}

public sealed record ResetPasswordCommand(string Token, string NewPassword) : ICommand;

public sealed class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NewPassword).ValidNewPassword();
    }
}

public sealed class ResetPasswordCommandHandler(
    ICustomerRepository customerRepository,
    ISecurityTokenRepository tokenRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IPasswordHasher passwordHasher,
    ITokenHasher tokenHasher,
    IUnitOfWork unitOfWork)
    : ICommandHandler<ResetPasswordCommand>
{
    public async Task<Result> Handle(ResetPasswordCommand command, CancellationToken ct)
    {
        var token = await tokenRepository.GetUsableAsync(
            tokenHasher.Hash(command.Token), SecurityTokenPurpose.PasswordReset, ct);

        if (token is null)
            return Result.Failure(CustomerErrors.InvalidToken);

        var customer = await customerRepository.GetByIdAsync(token.CustomerId, ct);
        if (customer is null || !customer.IsActive || customer.IsAnonymized)
            return Result.Failure(CustomerErrors.InvalidToken);

        await using var transaction = await unitOfWork.BeginTransactionAsync(ct);

        token.MarkUsed();
        customer.ChangePasswordHash(passwordHasher.Hash(command.NewPassword));

        // A reset usually means "someone may have my account" — sign every
        // session out so a thief's refresh token dies with the old password.
        await refreshTokenRepository.RevokeAllForCustomerAsync(customer.Id, "Password reset", ct);

        // A password reset also proves control of the inbox, so it verifies
        // the address and attaches any guest orders.
        customer.VerifyEmail();

        await unitOfWork.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Result.Success();
    }
}