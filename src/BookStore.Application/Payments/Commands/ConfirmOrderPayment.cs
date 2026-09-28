using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Payments;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Inventory;
using BookStore.Domain.Orders;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace BookStore.Application.Payments.Commands;

public enum PaymentConfirmationOutcome
{
    Confirmed = 0,
    AlreadyProcessed = 1,

    /// Money arrived that we can't honour (no matching order, order no
    /// longer payable, or amount mismatch). It was refunded automatically.
    RefundedUnfulfillable = 2
}

/// Gateway-agnostic "a payment succeeded" command. The dev endpoint sends it
/// today; the Stripe webhook adapter will send exactly the same command.
public sealed record ConfirmOrderPaymentCommand(
    string EventId,
    string CheckoutSessionId,
    string PaymentReference,
    decimal AmountPaid,
    string Currency) : ICommand<PaymentConfirmationOutcome>;

public sealed class ConfirmOrderPaymentCommandValidator : AbstractValidator<ConfirmOrderPaymentCommand>
{
    public ConfirmOrderPaymentCommandValidator()
    {
        RuleFor(x => x.EventId).NotEmpty().MaximumLength(255);
        RuleFor(x => x.CheckoutSessionId).NotEmpty().MaximumLength(200);
        RuleFor(x => x.PaymentReference).NotEmpty().MaximumLength(200);
        RuleFor(x => x.AmountPaid).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Currency).NotEmpty().Length(3);
    }
}

public sealed class ConfirmOrderPaymentCommandHandler(
    IOrderRepository orderRepository,
    IBookRepository bookRepository,
    IStockMovementRepository stockMovementRepository,
    IProcessedPaymentEventStore processedEvents,
    IPaymentGateway paymentGateway,
    IUnitOfWork unitOfWork,
    ILogger<ConfirmOrderPaymentCommandHandler> logger)
    : ICommandHandler<ConfirmOrderPaymentCommand, PaymentConfirmationOutcome>
{
    public async Task<Result<PaymentConfirmationOutcome>> Handle(ConfirmOrderPaymentCommand command, CancellationToken ct)
    {
        // Layer 1 of idempotency: seen this exact event before.
        if (await processedEvents.ExistsAsync(command.EventId, ct))
            return Result.Success(PaymentConfirmationOutcome.AlreadyProcessed);

        var order = await orderRepository.GetByCheckoutSessionIdAsync(command.CheckoutSessionId, ct);

        if (order is null)
        {
            // A session with no order behind it (e.g. checkout's save failed
            // after the session was created). The money must go back.
            return await RefundUnfulfillableAsync(command, "No order matches this checkout session", ct);
        }

        // Layer 2: the same payment reported again under a different event
        // id (gateways do this). Checked BEFORE the "not payable" branch
        // below, so a duplicate can never trigger a refund of a good payment.
        if (order.PaymentReference == command.PaymentReference)
        {
            processedEvents.Add(command.EventId, "PaymentDuplicate");
            await unitOfWork.SaveChangesAsync(ct);
            return Result.Success(PaymentConfirmationOutcome.AlreadyProcessed);
        }

        var amountMatches =
            command.AmountPaid == order.Total.Amount &&
            string.Equals(command.Currency, order.Total.Currency, StringComparison.OrdinalIgnoreCase);

        if (!order.CanBeMarkedPaid || !amountMatches)
        {
            var reason = !amountMatches
                ? $"Amount mismatch: paid {command.AmountPaid} {command.Currency}, order total {order.Total}"
                : $"Order {order.OrderNumber} is {order.Status} and can no longer be paid";

            return await RefundUnfulfillableAsync(command, reason, ct);
        }

        // Layer 3: the transaction plus the order's RowVersion. If two
        // deliveries race past the checks above, the second SaveChanges hits
        // a concurrency conflict, everything rolls back, and the gateway's
        // retry then lands on layer 1.
        await using var transaction = await unitOfWork.BeginTransactionAsync(ct);

        // Raises OrderPaidDomainEvent -> outbox -> confirmation email,
        // written in this same SaveChanges.
        order.MarkAsPaid(command.PaymentReference);

        foreach (var line in order.Lines)
        {
            // Reservation becomes a real sale: reserved and physical stock
            // both drop, and the ledger records why.
            await bookRepository.ConfirmSaleAsync(line.BookId, line.Quantity, ct);

            stockMovementRepository.Add(StockMovement.Create(
                line.BookId, -line.Quantity, StockMovementReason.Sale, orderId: order.Id));
        }

        processedEvents.Add(command.EventId, "PaymentSucceeded");

        await unitOfWork.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation("Order {OrderNumber} paid ({Reference}).", order.OrderNumber, command.PaymentReference);

        return Result.Success(PaymentConfirmationOutcome.Confirmed);
    }

    private async Task<Result<PaymentConfirmationOutcome>> RefundUnfulfillableAsync(
        ConfirmOrderPaymentCommand command, string reason, CancellationToken ct)
    {
        logger.LogCritical(
            "Unfulfillable payment {Reference} for session {SessionId}: {Reason}. Refunding automatically.",
            command.PaymentReference, command.CheckoutSessionId, reason);

        await paymentGateway.RefundAsync(new RefundRequest(
            command.PaymentReference, command.AmountPaid, command.Currency, reason,
            IdempotencyKey: $"auto-refund-{command.PaymentReference}"), ct);

        processedEvents.Add(command.EventId, "PaymentRefundedUnfulfillable");
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(PaymentConfirmationOutcome.RefundedUnfulfillable);
    }
}