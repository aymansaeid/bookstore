using BookStore.Domain.Orders;

namespace BookStore.Application.Abstractions.Repositories;

public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Order?> GetByOrderNumberAsync(string orderNumber, CancellationToken ct = default);
    Task<Order?> GetByStripeCheckoutSessionIdAsync(string sessionId, CancellationToken ct = default);
    void Add(Order order);
    Task<IReadOnlyList<Order>> ListByCustomerIdAsync(int customerId, CancellationToken ct = default);
    Task<IReadOnlyList<Order>> ListUnclaimedByEmailAsync(string email, CancellationToken ct = default);

    /// Does this customer have an order containing the book that's Delivered,
    /// or Shipped on or before the cutoff?
    Task<bool> HasReviewablePurchaseAsync(
        int customerId, int bookId, DateTimeOffset shippedOnOrBeforeUtc, CancellationToken ct = default);
}