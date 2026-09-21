namespace BookStore.Application.Abstractions.Payments;

public sealed record CheckoutLineItem(string Description, decimal UnitPrice, string Currency, int Quantity);

public sealed record CreateCheckoutSessionRequest(
    string OrderNumber,
    string CustomerEmail,
    IReadOnlyCollection<CheckoutLineItem> LineItems,
    decimal ShippingAmount,
    string Currency,
    string SuccessUrl,
    string CancelUrl);

public sealed record CheckoutSessionResult(string SessionId, string CheckoutUrl);

public interface IPaymentGateway
{
    Task<CheckoutSessionResult> CreateCheckoutSessionAsync(
        CreateCheckoutSessionRequest request, CancellationToken ct = default);
}