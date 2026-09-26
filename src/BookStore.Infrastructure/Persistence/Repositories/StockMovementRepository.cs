using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Inventory;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class StockMovementRepository(BookStoreDbContext dbContext) : IStockMovementRepository
{
    public void Add(StockMovement movement) => dbContext.Set<StockMovement>().Add(movement);

    public async Task<PagedResult<StockMovement>> ListByBookAsync(
        int bookId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = dbContext.Set<StockMovement>().AsNoTracking().Where(m => m.BookId == bookId);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(m => m.OccurredAtUtc)
            .ThenByDescending(m => m.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<StockMovement>(items, page, pageSize, total);
    }

    public Task<int> SumByBookAsync(int bookId, CancellationToken ct = default) =>
        dbContext.Set<StockMovement>().Where(m => m.BookId == bookId).SumAsync(m => m.QuantityDelta, ct);

    public async Task<IReadOnlyDictionary<int, int>> SumAllByBookAsync(CancellationToken ct = default) =>
        await dbContext.Set<StockMovement>()
            .GroupBy(m => m.BookId)
            .Select(g => new { BookId = g.Key, Total = g.Sum(m => m.QuantityDelta) })
            .ToDictionaryAsync(x => x.BookId, x => x.Total, ct);
}