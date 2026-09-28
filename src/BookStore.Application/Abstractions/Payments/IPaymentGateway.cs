namespace BookStore.Application.Abstractions.Payments;

public sealed record CheckoutLineItem(string Description, decimal UnitPrice, int Quantity);

public sealed record CreateCheckoutSessionRequest(
    string OrderNumber,
    string CustomerEmail,
    IReadOnlyCollection<CheckoutLineItem> LineItems,
    decimal ShippingAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    string Currency,
    string SuccessUrl,
    string CancelUrl,
    DateTimeOffset ExpiresAtUtc,
    string IdempotencyKey);

public sealed record CheckoutSessionResult(string SessionId, string CheckoutUrl, DateTimeOffset ExpiresAtUtc);

public enum ExpireSessionOutcome
{
    Expired = 0,
    AlreadyCompleted = 1,
    NotFound = 2
}

/// What the gateway knows about a completed payment. Returned with
/// AlreadyCompleted so a lost webhook can be reconciled without it.
public sealed record CompletedPayment(string PaymentReference, decimal Amount, string Currency);

public sealed record ExpireSessionResult(ExpireSessionOutcome Outcome, CompletedPayment? Payment = null);
public sealed record RefundRequest(
    string PaymentReference, decimal Amount, string Currency, string Reason, string IdempotencyKey);

public sealed record RefundResult(string RefundReference);

public interface IPaymentGateway
{
    /// Implementations must charge exactly TotalAmount. Line items, shipping
    /// and discount are for display on the payment page; the total is the
    /// server-computed truth.
    Task<CheckoutSessionResult> CreateCheckoutSessionAsync(
        CreateCheckoutSessionRequest request, CancellationToken ct = default);

    /// Closes an open session so it can no longer be paid. If the payment went
    /// through first, returns AlreadyCompleted with the payment details, so the
    /// caller can confirm it even if the webhook never arrives.
    Task<ExpireSessionResult> ExpireSessionAsync(string sessionId, CancellationToken ct = default);
    /// The idempotency key makes retries safe: the gateway returns the
    /// original refund instead of paying out a second time.
    Task<RefundResult> RefundAsync(RefundRequest request, CancellationToken ct = default);
}