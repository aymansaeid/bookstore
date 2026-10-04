using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Payments;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Inventory;
using BookStore.Domain.Orders;

namespace BookStore.Application.Orders;

public sealed record CancellationActor(int? AdminUserId, bool ByCustomer)
{
    public static readonly CancellationActor Customer = new(null, true);
    public static CancellationActor Admin(int? adminUserId) => new(adminUserId, false);
}

/// The single cancellation path used by BOTH the admin and the customer
/// endpoints. Cancelling touches money, stock and coupons, so it must never
/// exist in two slightly different versions.
public sealed class OrderCancellation(
    IBookRepository bookRepository,
    ICouponRepository couponRepository,
    IStockMovementRepository stockMovementRepository,
    IPaymentGateway paymentGateway,
    IUnitOfWork unitOfWork)
{
    public async Task<Result> CancelAsync(Order order, string reason, CancellationActor actor, CancellationToken ct)
    {
        if (!order.CanBeCancelled)
            return Result.Failure(OrderErrors.InvalidStatus(order.Status, "cancel"));

        var wasPaid = order.Status == OrderStatus.Paid;

        // Pending: close the payment session FIRST, so nobody can pay after
        // the stock is released. If payment just went through, stop.
        if (!wasPaid && order.CheckoutSessionId is { } sessionId)
        {
            var expiry = await paymentGateway.ExpireSessionAsync(sessionId, ct);
            if (expiry.Outcome == ExpireSessionOutcome.AlreadyCompleted)
                return Result.Failure(OrderErrors.PaymentJustCompleted);
        }

        // Paid: refund BEFORE the database work, keyed to the order, so a
        // retry after a failed save returns the same refund, never a second one.
        RefundResult? refund = null;
        if (wasPaid)
        {
            if (order.PaymentReference is null)
                return Result.Failure(OrderErrors.NoPaymentReference);

            refund = await paymentGateway.RefundAsync(new RefundRequest(
                order.PaymentReference, order.Total.Amount, order.Total.Currency,
                reason, IdempotencyKey: $"cancel-refund-{order.Id}"), ct);
        }

        await using var transaction = await unitOfWork.BeginTransactionAsync(ct);

        order.Cancel(reason, actor.ByCustomer);

        if (refund is not null)
            order.RecordRefund(refund.RefundReference);

        var who = actor.ByCustomer ? "by the customer" : "by the store";

        foreach (var line in order.Lines)
        {
            if (wasPaid)
            {
                await bookRepository.RestockAsync(line.BookId, line.Quantity, ct);

                stockMovementRepository.Add(StockMovement.Create(
                    line.BookId, line.Quantity, StockMovementReason.CancellationRestock,
                    $"Order {order.OrderNumber} cancelled {who} before shipping",
                    orderId: order.Id, adminUserId: actor.AdminUserId));
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

        return Result.Success();
    }
}