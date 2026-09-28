using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Payments;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Inventory;
using BookStore.Domain.Orders;
using FluentValidation;

namespace BookStore.Application.Orders.Commands;

public sealed record CancelOrderCommand(int OrderId, string Reason)
    : ICommand<AdminOrderDetailsDto>, IAuditableCommand
{
    public string AuditEntityType => "Order";
    public string? AuditEntityId => OrderId.ToString();
}

public sealed class CancelOrderCommandValidator : AbstractValidator<CancelOrderCommand>
{
    public CancelOrderCommandValidator()
    {
        RuleFor(x => x.OrderId).GreaterThan(0);
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}

public sealed class CancelOrderCommandHandler(
    IOrderRepository orderRepository,
    IBookRepository bookRepository,
    ICouponRepository couponRepository,
    IStockMovementRepository stockMovementRepository,
    IPaymentGateway paymentGateway,
    ICurrentActor currentActor,
    IUnitOfWork unitOfWork)
    : ICommandHandler<CancelOrderCommand, AdminOrderDetailsDto>
{
    public async Task<Result<AdminOrderDetailsDto>> Handle(CancelOrderCommand command, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(command.OrderId, ct);
        if (order is null)
            return Result.Failure<AdminOrderDetailsDto>(OrderErrors.NotFound(command.OrderId));

        if (!order.CanBeCancelled)
            return Result.Failure<AdminOrderDetailsDto>(OrderErrors.InvalidStatus(order.Status, "cancel"));

        var wasPaid = order.Status == OrderStatus.Paid;

        // Pending order: close the payment session FIRST, so the customer
        // can't pay after we've released their stock. If the gateway says
        // they already paid, stop; the payment confirmation is on its way.
        if (!wasPaid && order.CheckoutSessionId is { } sessionId)
        {
            var result = await paymentGateway.ExpireSessionAsync(sessionId, ct);
            if (result.Outcome == ExpireSessionOutcome.AlreadyCompleted)
                return Result.Failure<AdminOrderDetailsDto>(OrderErrors.PaymentJustCompleted);
        }

        // Paid order: refund BEFORE touching the database. The idempotency
        // key is tied to the order, so if the DB step below fails and the
        // admin clicks cancel again, the gateway returns the SAME refund
        // rather than paying out twice. The reverse order (DB first, then
        // refund) risks a cancelled order whose money was never returned.
        RefundResult? refund = null;
        if (wasPaid)
        {
            if (order.PaymentReference is null)
                return Result.Failure<AdminOrderDetailsDto>(OrderErrors.NoPaymentReference);

            refund = await paymentGateway.RefundAsync(new RefundRequest(
                order.PaymentReference, order.Total.Amount, order.Total.Currency,
                command.Reason, IdempotencyKey: $"cancel-refund-{order.Id}"), ct);
        }

        await using var transaction = await unitOfWork.BeginTransactionAsync(ct);

        order.Cancel(command.Reason);

        if (refund is not null)
            order.RecordRefund(refund.RefundReference);

        foreach (var line in order.Lines)
        {
            if (wasPaid)
            {
                await bookRepository.RestockAsync(line.BookId, line.Quantity, ct);

                stockMovementRepository.Add(StockMovement.Create(
                    line.BookId, line.Quantity, StockMovementReason.CancellationRestock,
                    $"Order {order.OrderNumber} cancelled before shipping",
                    orderId: order.Id, adminUserId: currentActor.AdminUserId));
            }
            else
            {
                await bookRepository.ReleaseReservationAsync(line.BookId, line.Quantity, ct);
            }
        }

        if (order.AppliedCouponCode is not null)
            await couponRepository.ReleaseRedemptionAsync(order.AppliedCouponCode, ct);

        await unitOfWork.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Result.Success(order.ToAdminDetailsDto());
    }
}