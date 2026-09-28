using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Payments;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Orders;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BookStore.Application.Payments.Commands;

public enum ExpireCheckoutOutcome
{
    /// Stock and coupon released, order marked Expired.
    Expired = 0,

    /// Session hasn't expired yet (only possible without Force).
    NotYetDue = 1,

    /// Order is no longer pending (paid, cancelled, already expired).
    AlreadyResolved = 2,

    /// The gateway said it was paid, and we confirmed the payment ourselves
    /// because the webhook never arrived.
    PaymentReconciled = 3,

    /// The gateway said it was paid but gave no details; left for the
    /// webhook to finish. Should never happen with a real gateway.
    PaymentInFlight = 4
}

/// Force skips the "has it actually expired?" check. Used only by the dev
/// endpoint, so testing doesn't require waiting 30 minutes.
public sealed record ExpireCheckoutCommand(int OrderId, bool Force = false) : ICommand<ExpireCheckoutOutcome>;

public sealed class ExpireCheckoutCommandHandler(
    IOrderRepository orderRepository,
    IBookRepository bookRepository,
    ICouponRepository couponRepository,
    IPaymentGateway paymentGateway,
    ISender sender,
    IUnitOfWork unitOfWork,
    ILogger<ExpireCheckoutCommandHandler> logger)
    : ICommandHandler<ExpireCheckoutCommand, ExpireCheckoutOutcome>
{
    public async Task<Result<ExpireCheckoutOutcome>> Handle(ExpireCheckoutCommand command, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(command.OrderId, ct);
        if (order is null)
            return Result.Failure<ExpireCheckoutOutcome>(OrderErrors.NotFound(command.OrderId));

        if (!order.CanBeExpired)
            return Result.Success(ExpireCheckoutOutcome.AlreadyResolved);

        if (!command.Force && (order.CheckoutExpiresAtUtc is null || order.CheckoutExpiresAtUtc > DateTimeOffset.UtcNow))
            return Result.Success(ExpireCheckoutOutcome.NotYetDue);

        // Gateway first: once the session is closed, nobody can pay it, so
        // releasing the stock below can never strand a paying customer.
        if (order.CheckoutSessionId is { } sessionId)
        {
            var result = await paymentGateway.ExpireSessionAsync(sessionId, ct);

            if (result.Outcome == ExpireSessionOutcome.AlreadyCompleted)
                return await ReconcileAsync(order.OrderNumber, sessionId, result.Payment, ct);
        }

        await using var transaction = await unitOfWork.BeginTransactionAsync(ct);

        order.Expire();

        foreach (var line in order.Lines)
            await bookRepository.ReleaseReservationAsync(line.BookId, line.Quantity, ct);

        if (order.AppliedCouponCode is not null)
            await couponRepository.ReleaseRedemptionAsync(order.AppliedCouponCode, ct);

        await unitOfWork.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation("Expired abandoned checkout {OrderNumber}; stock and coupon released.", order.OrderNumber);

        return Result.Success(ExpireCheckoutOutcome.Expired);
    }

    private async Task<Result<ExpireCheckoutOutcome>> ReconcileAsync(
        string orderNumber, string sessionId, CompletedPayment? payment, CancellationToken ct)
    {
        if (payment is null)
        {
            logger.LogWarning(
                "Gateway reports session {SessionId} ({OrderNumber}) paid but returned no details; waiting for the webhook.",
                sessionId, orderNumber);

            return Result.Success(ExpireCheckoutOutcome.PaymentInFlight);
        }

        logger.LogWarning(
            "Order {OrderNumber} was paid but never confirmed (lost or delayed webhook). Reconciling now.", orderNumber);

        // Deliberately the SAME command the webhook uses, sent through the
        // mediator so validation runs too. If the real webhook arrives later,
        // its payment reference matches and it's recognised as a duplicate.
        var confirmation = await sender.Send(new ConfirmOrderPaymentCommand(
            $"reconcile-{sessionId}", sessionId, payment.PaymentReference, payment.Amount, payment.Currency), ct);

        return confirmation.IsSuccess
            ? Result.Success(ExpireCheckoutOutcome.PaymentReconciled)
            : Result.Failure<ExpireCheckoutOutcome>(confirmation.Error);
    }
}