using BookStore.Application.Common;

namespace BookStore.Application.Payments;

public static class PaymentErrors
{
    public static Error SessionNotFound(string sessionId) =>
        Error.NotFound("Payment.SessionNotFound", $"No order is linked to checkout session '{sessionId}'.");
}