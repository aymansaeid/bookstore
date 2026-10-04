using BookStore.Application.Common;
using BookStore.Domain.Orders;

namespace BookStore.Application.Orders;

public static class OrderErrors
{
    public static Error NotFound(int id) =>
        Error.NotFound("Order.NotFound", $"Order {id} was not found.");

    public static Error InvalidStatus(OrderStatus current, string action) =>
        Error.Conflict("Order.InvalidStatus", $"Cannot {action} an order that is {current}.");

    // Public tracking: same answer whether the order number or the email
    // was wrong, so the endpoint can't be used to probe either.
    public static Error TrackingNotFound =>
        Error.NotFound("Order.TrackingNotFound", "No order matches that order number and email.");

    public static Error PaymentJustCompleted =>
    Error.Conflict("Order.PaymentJustCompleted",
        "The customer completed payment while you were cancelling. Refresh the order; it's now Paid.");

    public static Error NoPaymentReference =>
        Error.Conflict("Order.NoPaymentReference",
            "This order has no payment reference, so it can't be refunded automatically. Refund it manually in your payment provider.");
    public static Error AlreadyShipped =>
    Error.Conflict("Order.AlreadyShipped",
        "This order has already shipped, so it can't be cancelled. Once it arrives, you can return it within 14 days.");
}