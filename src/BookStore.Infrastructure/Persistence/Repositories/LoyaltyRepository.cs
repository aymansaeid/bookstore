using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Loyalty;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class LoyaltyRepository(BookStoreDbContext dbContext) : ILoyaltyRepository
{
    public async Task<int> GetBalanceAsync(int customerId, CancellationToken ct = default) =>
        await dbContext.LoyaltyTransactions.Where(t => t.CustomerId == customerId).SumAsync(t => (int?)t.Points ?? 0, ct);

    public async Task<int> GetNetEarnedSinceAsync(int customerId, DateTimeOffset sinceUtc, CancellationToken ct = default) =>
        await dbContext.LoyaltyTransactions
            .Where(t => t.CustomerId == customerId
                        && t.CreatedAtUtc >= sinceUtc
                        && (t.Type == LoyaltyTransactionType.Earned || t.Type == LoyaltyTransactionType.ReturnClawback))
            .SumAsync(t => (int?)t.Points ?? 0, ct);

    public Task<bool> ExistsAsync(int customerId, LoyaltyTransactionType type, string referenceKey, CancellationToken ct = default) =>
        dbContext.LoyaltyTransactions.AnyAsync(t => t.CustomerId == customerId && t.Type == type && t.ReferenceKey == referenceKey, ct);

    public async Task<int> SumForOrderAsync(int customerId, string orderNumber, LoyaltyTransactionType type, CancellationToken ct = default) =>
        await dbContext.LoyaltyTransactions
            .Where(t => t.CustomerId == customerId && t.OrderNumber == orderNumber && t.Type == type)
            .SumAsync(t => (int?)t.Points ?? 0, ct);

    public async Task<PagedResult<LoyaltyTransaction>> ListAsync(int customerId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = dbContext.LoyaltyTransactions.AsNoTracking().Where(t => t.CustomerId == customerId);
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(t => t.CreatedAtUtc).ThenByDescending(t => t.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<LoyaltyTransaction>(items, page, pageSize, total);
    }

    public void Add(LoyaltyTransaction transaction) => dbContext.LoyaltyTransactions.Add(transaction);

    public async Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default) =>
        await dbContext.LoyaltyTransactions.Where(t => t.CustomerId == customerId).ExecuteDeleteAsync(ct);
}