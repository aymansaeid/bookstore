using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auth;
using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Emails;
using BookStore.Domain.Auth;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Customers.Commands;

public sealed record ResendVerificationEmailCommand(string Email) : ICommand;

public sealed class ResendVerificationEmailCommandValidator : AbstractValidator<ResendVerificationEmailCommand>
{
    public ResendVerificationEmailCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
    }
}

public sealed class ResendVerificationEmailCommandHandler(
    ICustomerRepository customerRepository,
    ISecurityTokenRepository tokenRepository,
    ITokenHasher tokenHasher,
    IEmailSender emailSender,
    IUnitOfWork unitOfWork,
    IOptions<StoreOptions> storeOptions)
    : ICommandHandler<ResendVerificationEmailCommand>
{
    // Same lifetime as the link sent at registration.
    private static readonly TimeSpan VerificationValidity = TimeSpan.FromHours(24);

    // IP rate limits can't stop many machines flooding ONE inbox; this can.
    private static readonly TimeSpan MinResendInterval = TimeSpan.FromSeconds(60);

    public async Task<Result> Handle(ResendVerificationEmailCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByEmailAsync(command.Email.Trim().ToLowerInvariant(), ct);

        // Every path returns the same 204: never reveal whether the address
        // has an account, or whether it's already verified.
        if (customer is null || !customer.IsActive || customer.IsAnonymized || customer.IsEmailVerified)
            return Result.Success();

        var lastIssued = await tokenRepository.GetLatestIssuedAtAsync(
            customer.Id, SecurityTokenPurpose.EmailVerification, ct);

        if (lastIssued is { } issuedAt && DateTimeOffset.UtcNow - issuedAt < MinResendInterval)
            return Result.Success();

        // Only the newest link works: older ones die now.
        await tokenRepository.InvalidateAllAsync(customer.Id, SecurityTokenPurpose.EmailVerification, ct);

        var generated = tokenHasher.Generate();
        tokenRepository.Add(SecurityToken.Create(
            customer.Id, generated.TokenHash, SecurityTokenPurpose.EmailVerification, VerificationValidity));

        await unitOfWork.SaveChangesAsync(ct);

        await emailSender.SendAsync(
            CustomerEmailTemplates.VerifyEmail(customer, generated.PlainToken, storeOptions.Value), ct);

        return Result.Success();
    }
}