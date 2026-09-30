using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Orders;

namespace BookStore.Application.Returns;

/// Same credentials and the same vagueness as order tracking: a wrong
/// order number and a wrong email are indistinguishable.
internal static class ReturnLookup
{
    public static async Task<Order?> FindOrderAsync(
        IOrderRepository orderRepository, string orderNumber, string email, CancellationToken ct)
    {
        var order = await orderRepository.GetByOrderNumberAsync(orderNumber.Trim().ToUpperInvariant(), ct);

        return order is not null
               && string.Equals(order.CustomerEmail, email.Trim().ToLowerInvariant(), StringComparison.Ordinal)
            ? order
            : null;
    }
}