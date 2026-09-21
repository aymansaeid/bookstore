namespace BookStore.Domain.Orders;

public sealed class InvalidOrderStateTransitionException(int orderId, OrderStatus current, string attemptedAction)
    : Exception($"Cannot {attemptedAction} order {orderId} while it is {current}.")
{
    public int OrderId { get; } = orderId;
    public OrderStatus CurrentStatus { get; } = current;
}