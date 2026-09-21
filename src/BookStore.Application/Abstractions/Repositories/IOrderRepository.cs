using BookStore.Domain.Orders;

namespace BookStore.Application.Abstractions.Repositories;

public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Order?> GetByOrderNumberAsync(string orderNumber, CancellationToken ct = default);
    Task<Order?> GetByStripeCheckoutSessionIdAsync(string sessionId, CancellationToken ct = default);
    void Add(Order order);
}