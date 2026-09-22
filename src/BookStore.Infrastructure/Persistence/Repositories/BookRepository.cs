using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Books;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class BookRepository(BookStoreDbContext dbContext) : IBookRepository
{

    public async Task<bool> TryReserveStockAsync(int bookId, int quantity, CancellationToken ct = default)
    {
        // This is the fix from the very first audit: one atomic UPDATE, not
        // load-then-save. Two guests racing for the last copy both run this
        // statement; SQL Server serializes the row write, so only one can
        // possibly match the WHERE clause. The other gets 0 rows affected —
        // no exception, no partial state, just "you lost the race."
        var rowsAffected = await dbContext.Books
          .Where(b => b.Id == bookId && b.IsActive && (b.StockQuantity - b.ReservedQuantity) >= quantity)
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

    public void Add(Book book) => dbContext.Books.Add(book);

    public Task<bool> IsbnExistsAsync(string isbn, int? excludeBookId, CancellationToken ct = default) =>
        dbContext.Books.AnyAsync(b => b.Isbn == isbn && (excludeBookId == null || b.Id != excludeBookId), ct);
    public async Task RestockAsync(int bookId, int quantity, CancellationToken ct = default) =>
        await dbContext.Books
            .Where(b => b.Id == bookId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(b => b.StockQuantity, b => b.StockQuantity + quantity), ct);
    public Task<Book?> GetByIdAsync(int id, CancellationToken ct = default) =>
    dbContext.Books.Include(b => b.Images).FirstOrDefaultAsync(b => b.Id == id, ct);

    public Task<Book?> GetBySlugAsync(string slug, CancellationToken ct = default) =>
        dbContext.Books.Include(b => b.Images).FirstOrDefaultAsync(b => b.Slug == Slug.Create(slug), ct);

    public Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default) =>
        dbContext.Books.AnyAsync(b => b.Slug == Slug.Create(slug), ct);

    public async Task<IReadOnlyList<Book>> ListAsync(bool includeInactive, CancellationToken ct = default) =>
        await dbContext.Books
            .AsNoTracking()
            .Include(b => b.Images)
            .Where(b => includeInactive || b.IsActive)
            .OrderBy(b => b.Title)
            .ToListAsync(ct);
}