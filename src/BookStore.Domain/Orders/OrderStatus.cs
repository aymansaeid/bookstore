namespace BookStore.Domain.Orders;

public enum OrderStatus
{
    PendingPayment = 0,
    Paid = 1,
    Shipped = 2,
    Delivered = 3,
    Cancelled = 4,
    Expired = 5,
    Refunded = 6
}