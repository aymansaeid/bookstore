using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Books;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class BookRepository(BookStoreDbContext dbContext) : IBookRepository
{
    public Task<Book?> GetByIdAsync(int id, CancellationToken ct = default) =>
        dbContext.Books.FirstOrDefaultAsync(b => b.Id == id, ct);

    public async Task<bool> TryReserveStockAsync(int bookId, int quantity, CancellationToken ct = default)
    {
        // This is the fix from the very first audit: one atomic UPDATE, not
        // load-then-save. Two guests racing for the last copy both run this
        // statement; SQL Server serializes the row write, so only one can
        // possibly match the WHERE clause. The other gets 0 rows affected —
        // no exception, no partial state, just "you lost the race."
        var rowsAffected = await dbContext.Books
            .Where(b => b.Id == bookId && (b.StockQuantity - b.ReservedQuantity) >= quantity)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(b => b.ReservedQuantity, b => b.ReservedQuantity + quantity), ct);

        return rowsAffected == 1;
    }

    public async Task ReleaseReservationAsync(int bookId, int quantity, CancellationToken ct = default)
    {
        await dbContext.Books
            .Where(b => b.Id == bookId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(b => b.ReservedQuantity, b => b.ReservedQuantity - quantity), ct);
    }

    public async Task ConfirmSaleAsync(int bookId, int quantity, CancellationToken ct = default)
    {
        await dbContext.Books
            .Where(b => b.Id == bookId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(b => b.ReservedQuantity, b => b.ReservedQuantity - quantity)
                .SetProperty(b => b.StockQuantity, b => b.StockQuantity - quantity), ct);
    }
}