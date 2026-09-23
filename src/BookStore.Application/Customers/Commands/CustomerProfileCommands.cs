using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auth;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Auth;
using BookStore.Application.Common;
using FluentValidation;

namespace BookStore.Application.Customers.Commands;

public sealed record UpdateCustomerProfileCommand(
    int CustomerId, string FirstName, string LastName, string? Phone, bool AcceptsMarketingEmails)
    : ICommand<CustomerProfileDto>;

public sealed class UpdateCustomerProfileCommandValidator : AbstractValidator<UpdateCustomerProfileCommand>
{
    public UpdateCustomerProfileCommandValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Phone).MaximumLength(30);
    }
}

public sealed class UpdateCustomerProfileCommandHandler(
    ICustomerRepository customerRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<UpdateCustomerProfileCommand, CustomerProfileDto>
{
    public async Task<Result<CustomerProfileDto>> Handle(UpdateCustomerProfileCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null || !customer.IsActive)
            return Result.Failure<CustomerProfileDto>(CustomerErrors.AccountUnavailable);

        customer.UpdateProfile(command.FirstName, command.LastName, command.Phone, command.AcceptsMarketingEmails);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(customer.ToProfileDto());
    }
}

public sealed record ChangeCustomerPasswordCommand(int CustomerId, string CurrentPassword, string NewPassword) : ICommand;

public sealed class ChangeCustomerPasswordCommandValidator : AbstractValidator<ChangeCustomerPasswordCommand>
{
    public ChangeCustomerPasswordCommandValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().MaximumLength(PasswordRules.MaxLength);
        RuleFor(x => x.NewPassword)
            .ValidNewPassword()
            .NotEqual(x => x.CurrentPassword)
            .WithMessage("The new password must be different from the current one.");
    }
}

public sealed class ChangeCustomerPasswordCommandHandler(
    ICustomerRepository customerRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IPasswordHasher passwordHasher,
    IUnitOfWork unitOfWork)
    : ICommandHandler<ChangeCustomerPasswordCommand>
{
    public async Task<Result> Handle(ChangeCustomerPasswordCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null || !customer.IsActive)
            return Result.Failure(CustomerErrors.AccountUnavailable);

        if (passwordHasher.Verify(customer.PasswordHash, command.CurrentPassword) == PasswordVerification.Failed)
            return Result.Failure(CustomerErrors.CurrentPasswordIncorrect);

        customer.ChangePasswordHash(passwordHasher.Hash(command.NewPassword));
        await refreshTokenRepository.RevokeAllForCustomerAsync(customer.Id, "Password changed", ct);

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed record DeleteCustomerAccountCommand(int CustomerId, string Password) : ICommand;

public sealed class DeleteCustomerAccountCommandHandler(
    ICustomerRepository customerRepository,
    IOrderRepository orderRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IPasswordHasher passwordHasher,
    IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteCustomerAccountCommand>
{
    public async Task<Result> Handle(DeleteCustomerAccountCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null || !customer.IsActive)
            return Result.Failure(CustomerErrors.AccountUnavailable);

        if (passwordHasher.Verify(customer.PasswordHash, command.Password) == PasswordVerification.Failed)
            return Result.Failure(CustomerErrors.CurrentPasswordIncorrect);

        await using var transaction = await unitOfWork.BeginTransactionAsync(ct);

        // Orders are scrubbed, not deleted: invoices must be retained.
        var orders = await orderRepository.ListByCustomerIdAsync(customer.Id, ct);
        foreach (var order in orders)
            order.AnonymizeCustomerData();

        customer.Anonymize();
        await refreshTokenRepository.RevokeAllForCustomerAsync(customer.Id, "Account deleted", ct);

        await unitOfWork.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Result.Success();
    }
}