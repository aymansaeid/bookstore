using BookStore.Application.Common;
using BookStore.Domain.Inventory;

namespace BookStore.Application.Abstractions.Repositories;

public interface IStockMovementRepository
{
    void Add(StockMovement movement);
    Task<PagedResult<StockMovement>> ListByBookAsync(int bookId, int page, int pageSize, CancellationToken ct = default);
    Task<int> SumByBookAsync(int bookId, CancellationToken ct = default);
    Task<IReadOnlyDictionary<int, int>> SumAllByBookAsync(CancellationToken ct = default);
}