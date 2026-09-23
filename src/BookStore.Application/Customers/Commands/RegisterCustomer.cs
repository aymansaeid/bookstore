using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auth;
using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Auth;
using BookStore.Application.Common;
using BookStore.Application.Emails;
using BookStore.Domain.Auth;
using BookStore.Domain.Customers;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Customers.Commands;

public sealed record RegisterCustomerCommand(
    string Email, string Password, string FirstName, string LastName,
    string? Phone, bool AcceptsMarketingEmails) : ICommand;

public sealed class RegisterCustomerCommandValidator : AbstractValidator<RegisterCustomerCommand>
{
    public RegisterCustomerCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
        RuleFor(x => x.Password).ValidNewPassword();
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Phone).MaximumLength(30);
    }
}

public sealed class RegisterCustomerCommandHandler(
    ICustomerRepository customerRepository,
    ISecurityTokenRepository tokenRepository,
    IPasswordHasher passwordHasher,
    ITokenHasher tokenHasher,
    IEmailSender emailSender,
    IUnitOfWork unitOfWork,
    IOptions<StoreOptions> storeOptions)
    : ICommandHandler<RegisterCustomerCommand>
{
    private static readonly TimeSpan VerificationValidity = TimeSpan.FromHours(24);

    public async Task<Result> Handle(RegisterCustomerCommand command, CancellationToken ct)
    {
        var email = command.Email.Trim().ToLowerInvariant();
        var existing = await customerRepository.GetByEmailAsync(email, ct);

        // Always the same success response, whether or not the email is
        // taken — otherwise this endpoint tells attackers who your
        // customers are. An existing address gets a heads-up email instead.
        if (existing is not null)
        {
            if (!existing.IsAnonymized)
                await emailSender.SendAsync(
                    CustomerEmailTemplates.RegistrationAttemptOnExistingAccount(existing, storeOptions.Value), ct);

            return Result.Success();
        }

        var customer = Customer.Register(
            email,
            passwordHasher.Hash(command.Password),
            command.FirstName, command.LastName, command.Phone, command.AcceptsMarketingEmails);

        customerRepository.Add(customer);
        await unitOfWork.SaveChangesAsync(ct); // Needed so customer.Id exists.

        var generated = tokenHasher.Generate();
        tokenRepository.Add(SecurityToken.Create(
            customer.Id, generated.TokenHash, SecurityTokenPurpose.EmailVerification, VerificationValidity));

        await unitOfWork.SaveChangesAsync(ct);

        // Sent directly, not via outbox: the customer is waiting on this
        // right now, and a 10-second poll delay would feel broken.
        await emailSender.SendAsync(
            CustomerEmailTemplates.VerifyEmail(customer, generated.PlainToken, storeOptions.Value), ct);

        return Result.Success();
    }
}