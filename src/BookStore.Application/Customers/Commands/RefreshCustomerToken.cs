using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auth;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Auth;
using Microsoft.Extensions.Logging;

namespace BookStore.Application.Customers.Commands;

public sealed record RefreshCustomerTokenCommand(string RefreshToken) : ICommand<CustomerLoginResult>;

public sealed class RefreshCustomerTokenCommandHandler(
    ICustomerRepository customerRepository,
    IRefreshTokenRepository refreshTokenRepository,
    ITokenHasher tokenHasher,
    ICustomerTokenGenerator tokenGenerator,
    IUnitOfWork unitOfWork,
    ILogger<RefreshCustomerTokenCommandHandler> logger)
    : ICommandHandler<RefreshCustomerTokenCommand, CustomerLoginResult>
{
    public async Task<Result<CustomerLoginResult>> Handle(RefreshCustomerTokenCommand command, CancellationToken ct)
    {
        var hash = tokenHasher.Hash(command.RefreshToken);
        var token = await refreshTokenRepository.GetByHashAsync(hash, ct);

        if (token is null)
            return Result.Failure<CustomerLoginResult>(CustomerErrors.InvalidRefreshToken);

        // Reuse detection: a token that was already spent coming back means
        // two parties hold it — the real user and a thief. We can't tell
        // which is calling, so we kill the whole family and force a login.
        if (token.IsUsed)
        {
            await refreshTokenRepository.RevokeFamilyAsync(token.FamilyId, "Refresh token reuse detected", ct);
            await unitOfWork.SaveChangesAsync(ct);

            logger.LogWarning(
                "Refresh token reuse detected for customer {CustomerId}; family {FamilyId} revoked.",
                token.CustomerId, token.FamilyId);

            return Result.Failure<CustomerLoginResult>(CustomerErrors.InvalidRefreshToken);
        }

        if (!token.IsUsable)
            return Result.Failure<CustomerLoginResult>(CustomerErrors.InvalidRefreshToken);

        var customer = await customerRepository.GetByIdAsync(token.CustomerId, ct);
        if (customer is null || !customer.IsActive || customer.IsAnonymized)
            return Result.Failure<CustomerLoginResult>(CustomerErrors.AccountUnavailable);

        // Rotation: spend the old one, issue a new one in the same family.
        token.MarkUsed();

        var generated = tokenHasher.Generate();
        refreshTokenRepository.Add(RefreshToken.Create(
            customer.Id, generated.TokenHash, token.FamilyId, CustomerLoginCommandHandler.RefreshTokenValidity));

        await unitOfWork.SaveChangesAsync(ct);

        var accessToken = tokenGenerator.Generate(customer);

        return Result.Success(new CustomerLoginResult(
            new CustomerAuthResponse(accessToken.Token, accessToken.ExpiresAtUtc, customer.ToProfileDto()),
            generated.PlainToken,
            DateTimeOffset.UtcNow.Add(CustomerLoginCommandHandler.RefreshTokenValidity)));
    }
}

public sealed record LogoutCustomerCommand(string? RefreshToken) : ICommand;

public sealed class LogoutCustomerCommandHandler(
    IRefreshTokenRepository refreshTokenRepository,
    ITokenHasher tokenHasher,
    IUnitOfWork unitOfWork)
    : ICommandHandler<LogoutCustomerCommand>
{
    public async Task<Result> Handle(LogoutCustomerCommand command, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(command.RefreshToken))
            return Result.Success(); // Nothing to revoke; still a success.

        var token = await refreshTokenRepository.GetByHashAsync(tokenHasher.Hash(command.RefreshToken), ct);

        if (token is not null)
        {
            await refreshTokenRepository.RevokeFamilyAsync(token.FamilyId, "Signed out", ct);
            await unitOfWork.SaveChangesAsync(ct);
        }

        return Result.Success();
    }
}