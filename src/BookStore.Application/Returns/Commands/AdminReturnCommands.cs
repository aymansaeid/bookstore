using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Payments;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Orders;
using BookStore.Domain.Inventory;
using BookStore.Domain.Returns;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Returns.Commands;

public sealed record ApproveReturnCommand(int ReturnId, string? Instructions)
    : ICommand<AdminReturnDto>, IAuditableCommand
{
    public string AuditEntityType => "Return";
    public string? AuditEntityId => ReturnId.ToString();
}

public sealed record RejectReturnCommand(int ReturnId, string Reason)
    : ICommand<AdminReturnDto>, IAuditableCommand
{
    public string AuditEntityType => "Return";
    public string? AuditEntityId => ReturnId.ToString();
}

public sealed record ReturnLineConditionDto(int BookId, ReturnItemCondition Condition);

public sealed record CompleteReturnCommand(int ReturnId, IReadOnlyList<ReturnLineConditionDto> Conditions)
    : ICommand<AdminReturnDto>, IAuditableCommand
{
    public string AuditEntityType => "Return";
    public string? AuditEntityId => ReturnId.ToString();
}

public sealed class ApproveReturnCommandValidator : AbstractValidator<ApproveReturnCommand>
{
    public ApproveReturnCommandValidator() => RuleFor(x => x.Instructions).MaximumLength(2000);
}

public sealed class RejectReturnCommandValidator : AbstractValidator<RejectReturnCommand>
{
    public RejectReturnCommandValidator() =>
        RuleFor(x => x.Reason).NotEmpty().WithMessage("Explain the rejection; the customer will see it.").MaximumLength(1000);
}

public sealed class CompleteReturnCommandValidator : AbstractValidator<CompleteReturnCommand>
{
    public CompleteReturnCommandValidator()
    {
        RuleFor(x => x.Conditions).NotEmpty();
        RuleForEach(x => x.Conditions).ChildRules(c => c.RuleFor(x => x.Condition).IsInEnum());
    }
}

public sealed class ApproveReturnCommandHandler(
    IReturnRequestRepository returnRepository,
    ICurrentActor currentActor,
    IUnitOfWork unitOfWork,
    IOptions<ReturnOptions> returnOptions)
    : ICommandHandler<ApproveReturnCommand, AdminReturnDto>
{
    public async Task<Result<AdminReturnDto>> Handle(ApproveReturnCommand command, CancellationToken ct)
    {
        var request = await returnRepository.GetByIdAsync(command.ReturnId, ct);
        if (request is null)
            return Result.Failure<AdminReturnDto>(ReturnErrors.NotFound(command.ReturnId));

        if (!request.CanBeApproved)
            return Result.Failure<AdminReturnDto>(ReturnErrors.InvalidStatus(request.Status, "approve"));

        var instructions = string.IsNullOrWhiteSpace(command.Instructions)
            ? returnOptions.Value.DefaultReturnInstructions
            : command.Instructions;

        // Raises ReturnApprovedDomainEvent -> outbox -> email with instructions.
        request.Approve(currentActor.AdminUserId, instructions);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(request.ToAdminDto());
    }
}

public sealed class RejectReturnCommandHandler(
    IReturnRequestRepository returnRepository,
    ICurrentActor currentActor,
    IUnitOfWork unitOfWork)
    : ICommandHandler<RejectReturnCommand, AdminReturnDto>
{
    public async Task<Result<AdminReturnDto>> Handle(RejectReturnCommand command, CancellationToken ct)
    {
        var request = await returnRepository.GetByIdAsync(command.ReturnId, ct);
        if (request is null)
            return Result.Failure<AdminReturnDto>(ReturnErrors.NotFound(command.ReturnId));

        if (!request.CanBeRejected)
            return Result.Failure<AdminReturnDto>(ReturnErrors.InvalidStatus(request.Status, "reject"));

        request.Reject(currentActor.AdminUserId, command.Reason);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(request.ToAdminDto());
    }
}

public sealed class CompleteReturnCommandHandler(
    IReturnRequestRepository returnRepository,
    IOrderRepository orderRepository,
    IBookRepository bookRepository,
    IStockMovementRepository stockMovementRepository,
    IPaymentGateway paymentGateway,
    ICurrentActor currentActor,
    IUnitOfWork unitOfWork)
    : ICommandHandler<CompleteReturnCommand, AdminReturnDto>
{
    public async Task<Result<AdminReturnDto>> Handle(CompleteReturnCommand command, CancellationToken ct)
    {
        var request = await returnRepository.GetByIdAsync(command.ReturnId, ct);
        if (request is null)
            return Result.Failure<AdminReturnDto>(ReturnErrors.NotFound(command.ReturnId));

        if (!request.CanBeCompleted)
            return Result.Failure<AdminReturnDto>(ReturnErrors.InvalidStatus(request.Status, "complete"));

        // Check the inspection covers exactly the returned books BEFORE any
        // money moves, so a typo can never cause a refund with no record.
        var conditions = command.Conditions.ToDictionary(c => c.BookId, c => c.Condition);
        if (!request.Lines.Select(l => l.BookId).ToHashSet().SetEquals(conditions.Keys))
            return Result.Failure<AdminReturnDto>(ReturnErrors.IncompleteInspection);

        var order = await orderRepository.GetByIdAsync(request.OrderId, ct);
        if (order is null)
            return Result.Failure<AdminReturnDto>(OrderErrors.NotFound(request.OrderId));

        if (order.PaymentReference is null)
            return Result.Failure<AdminReturnDto>(OrderErrors.NoPaymentReference);

        // Refund first, keyed to this return: if the database step below
        // fails and the admin retries, the gateway hands back the SAME
        // refund instead of paying out twice. Same pattern as cancellation.
        var refund = await paymentGateway.RefundAsync(new RefundRequest(
            order.PaymentReference, request.RefundAmount.Amount, request.RefundAmount.Currency,
            $"Return for order {order.OrderNumber}", IdempotencyKey: $"return-refund-{request.Id}"), ct);

        await using var transaction = await unitOfWork.BeginTransactionAsync(ct);

        request.Complete(currentActor.AdminUserId, conditions, refund.RefundReference);

        foreach (var line in request.Lines.Where(l => l.ReceivedCondition == ReturnItemCondition.Resellable))
        {
            await bookRepository.RestockAsync(line.BookId, line.Quantity, ct);

            stockMovementRepository.Add(StockMovement.Create(
                line.BookId, line.Quantity, StockMovementReason.ReturnRestock,
                $"Return for order {order.OrderNumber}", orderId: order.Id, adminUserId: currentActor.AdminUserId));
        }

        // Damaged copies were deducted at the sale and never re-enter stock,
        // so the ledger has nothing to record for them.

        // A full return refunds the whole order, so the order itself becomes
        // Refunded (and drops out of revenue). A partial return leaves the
        // order Delivered; its refund lives on the return request.
        if (request.IsFullReturn)
        {
            order.Refund();
            order.RecordRefund(refund.RefundReference);
        }

        await unitOfWork.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Result.Success(request.ToAdminDto());
    }
}