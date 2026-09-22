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
}