using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Orders;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class OrderRepository(BookStoreDbContext dbContext) : IOrderRepository
{
    public Task<Order?> GetByIdAsync(int id, CancellationToken ct = default) =>
        dbContext.Orders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.Id == id, ct);

    public Task<Order?> GetByOrderNumberAsync(string orderNumber, CancellationToken ct = default) =>
        dbContext.Orders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, ct);

    public Task<Order?> GetByStripeCheckoutSessionIdAsync(string sessionId, CancellationToken ct = default) =>
        dbContext.Orders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.StripeCheckoutSessionId == sessionId, ct);

    public void Add(Order order) => dbContext.Orders.Add(order);
}