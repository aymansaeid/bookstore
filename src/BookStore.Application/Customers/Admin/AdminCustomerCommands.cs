using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Customers.Commands;
using BookStore.Application.Loyalty;
using BookStore.Domain.Loyalty;
using FluentValidation;
using MediatR;

namespace BookStore.Application.Customers.Admin;

// ---------- Deactivate / reactivate ----------

public sealed record SetCustomerActiveCommand(int CustomerId, bool IsActive) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "Customer";
    public string? AuditEntityId => CustomerId.ToString();
}

public sealed class SetCustomerActiveCommandHandler(
    ICustomerRepository customerRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IUnitOfWork unitOfWork)
    : ICommandHandler<SetCustomerActiveCommand>
{
    public async Task<Result> Handle(SetCustomerActiveCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null)
            return Result.Failure(AdminCustomerErrors.NotFound(command.CustomerId));

        // Reactivating a deleted account would resurrect a nameless shell its
        // owner asked us to remove.
        if (customer.IsAnonymized)
            return Result.Failure(AdminCustomerErrors.Anonymized);

        if (customer.IsActive == command.IsActive)
            return Result.Success(); // idempotent: nothing to change

        if (command.IsActive) customer.Activate();
        else customer.Deactivate();

        await unitOfWork.SaveChangesAsync(ct);

        // Login already refuses inactive accounts, but a stored refresh token
        // would keep a device signed in for up to 30 days. Cut them all.
        if (!command.IsActive)
            await refreshTokenRepository.RevokeAllForCustomerAsync(customer.Id, "Deactivated by admin", ct);

        return Result.Success();
    }
}

// ---------- Sign out everywhere ----------

public sealed record SignOutCustomerEverywhereCommand(int CustomerId) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "Customer";
    public string? AuditEntityId => CustomerId.ToString();
}

public sealed class SignOutCustomerEverywhereCommandHandler(
    ICustomerRepository customerRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IUnitOfWork unitOfWork)
    : ICommandHandler<SignOutCustomerEverywhereCommand>
{
    public async Task<Result> Handle(SignOutCustomerEverywhereCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null)
            return Result.Failure(AdminCustomerErrors.NotFound(command.CustomerId));

        await refreshTokenRepository.RevokeAllForCustomerAsync(customer.Id, "Signed out by admin", ct);

        // Nothing tracked changed, but the audit row recorded by the pipeline
        // only persists on SaveChanges.
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}

// ---------- Resend verification on the customer's behalf ----------

public sealed record AdminResendVerificationCommand(int CustomerId) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "Customer";
    public string? AuditEntityId => CustomerId.ToString();
}

public sealed class AdminResendVerificationCommandHandler(
    ICustomerRepository customerRepository, ISender sender, IUnitOfWork unitOfWork)
    : ICommandHandler<AdminResendVerificationCommand>
{
    public async Task<Result> Handle(AdminResendVerificationCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null)
            return Result.Failure(AdminCustomerErrors.NotFound(command.CustomerId));
        if (customer.IsAnonymized)
            return Result.Failure(AdminCustomerErrors.Anonymized);
        if (customer.IsEmailVerified)
            return Result.Failure(AdminCustomerErrors.AlreadyVerified);

        // Same path as the customer's own button: new link, old links die,
        // and the 60-second cooldown still applies.
        var result = await sender.Send(new ResendVerificationEmailCommand(customer.Email), ct);
        if (result.IsFailure)
            return result;

        await unitOfWork.SaveChangesAsync(ct); // persists the audit row
        return Result.Success();
    }
}

// ---------- Manual points adjustment ----------

public sealed record AdjustCustomerPointsCommand(int CustomerId, int Points, string Note, string? IdempotencyKey)
    : ICommand<LoyaltySummaryDto>, IAuditableCommand
{
    public string AuditEntityType => "Customer";
    public string? AuditEntityId => CustomerId.ToString();
    object IAuditableCommand.AuditDetails => new { CustomerId, Points, Note };
}

public sealed class AdjustCustomerPointsCommandValidator : AbstractValidator<AdjustCustomerPointsCommand>
{
    public AdjustCustomerPointsCommandValidator()
    {
        RuleFor(x => x.CustomerId).GreaterThan(0);
        RuleFor(x => x.Points).NotEqual(0).InclusiveBetween(-100_000, 100_000);
        RuleFor(x => x.Note).NotEmpty().MaximumLength(LoyaltyTransaction.MaxNoteLength);

        // "adjustment:" + key must fit the 100-character ReferenceKey column.
        RuleFor(x => x.IdempotencyKey).Length(8, 80).When(x => x.IdempotencyKey is not null);
    }
}

public sealed class AdjustCustomerPointsCommandHandler(
    ICustomerRepository customerRepository,
    ILoyaltyRepository loyaltyRepository,
    LoyaltyReader loyaltyReader,
    IUnitOfWork unitOfWork)
    : ICommandHandler<AdjustCustomerPointsCommand, LoyaltySummaryDto>
{
    public async Task<Result<LoyaltySummaryDto>> Handle(AdjustCustomerPointsCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null)
            return Result.Failure<LoyaltySummaryDto>(AdminCustomerErrors.NotFound(command.CustomerId));
        if (customer.IsAnonymized)
            return Result.Failure<LoyaltySummaryDto>(AdminCustomerErrors.Anonymized);

        var referenceKey = $"adjustment:{command.IdempotencyKey ?? Guid.NewGuid().ToString("N")}";

        // A double-clicked button with the same key returns the current
        // balance instead of adding the points twice.
        if (await loyaltyRepository.ExistsAsync(customer.Id, LoyaltyTransactionType.Adjustment, referenceKey, ct))
            return Result.Success(await loyaltyReader.SummaryAsync(customer.Id, ct));

        if (command.Points < 0)
        {
            var balance = await loyaltyRepository.GetBalanceAsync(customer.Id, ct);
            if (balance + command.Points < 0)
                return Result.Failure<LoyaltySummaryDto>(AdminCustomerErrors.InsufficientPoints(balance));
        }

        loyaltyRepository.Add(LoyaltyTransaction.Adjustment(customer.Id, command.Points, command.Note, referenceKey));
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(await loyaltyReader.SummaryAsync(customer.Id, ct));
    }
}