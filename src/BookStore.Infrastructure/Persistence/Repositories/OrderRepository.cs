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
    public async Task<IReadOnlyList<Order>> ListByCustomerIdAsync(int customerId, CancellationToken ct = default) =>
    await dbContext.Orders
        .Include(o => o.Lines)
        .Where(o => o.CustomerId == customerId)
        .OrderByDescending(o => o.CreatedAtUtc)
        .ToListAsync(ct);

    /// Guest orders (no customer yet) placed with this email. Used at
    /// verification time to attach order history to a proven address.
    public async Task<IReadOnlyList<Order>> ListUnclaimedByEmailAsync(string email, CancellationToken ct = default)
    {
        var normalized = email.Trim().ToLowerInvariant();

        return await dbContext.Orders
            .Include(o => o.Lines)
            .Where(o => o.CustomerId == null && o.CustomerEmail == normalized)
            .ToListAsync(ct);
    }
}