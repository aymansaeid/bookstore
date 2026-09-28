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

    /// Closes an open session so it can no longer be paid. Returns
    /// AlreadyCompleted if the payment went through first. The caller must
    /// then leave the order alone, because the payment confirmation is on
    /// its way.
    Task<ExpireSessionOutcome> ExpireSessionAsync(string sessionId, CancellationToken ct = default);

    /// The idempotency key makes retries safe: the gateway returns the
    /// original refund instead of paying out a second time.
    Task<RefundResult> RefundAsync(RefundRequest request, CancellationToken ct = default);
}