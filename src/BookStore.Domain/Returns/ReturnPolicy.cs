using BookStore.Domain.Orders;

namespace BookStore.Domain.Returns;

public static class ReturnPolicy
{
    /// The last moment a return can be requested, or null if the order
    /// can't be returned at all (not shipped yet, cancelled, refunded).
    ///
    /// Counted from delivery when we know it; otherwise from shipping plus a
    /// transit allowance. The legal clock starts at receipt, so erring later
    /// is safe and erring earlier is not.
    public static DateTimeOffset? GetDeadline(Order order, int windowDays, int transitAllowanceDays)
    {
        if (order.Status is not (OrderStatus.Shipped or OrderStatus.Delivered))
            return null;

        if (order.DeliveredAtUtc is { } delivered)
            return delivered.AddDays(windowDays);

        return order.ShippedAtUtc?.AddDays(windowDays + transitAllowanceDays);
    }
}