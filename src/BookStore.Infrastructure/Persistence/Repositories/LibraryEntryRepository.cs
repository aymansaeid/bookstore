using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Library;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class LibraryEntryRepository(BookStoreDbContext dbContext) : ILibraryEntryRepository
{
    public Task<LibraryEntry?> GetAsync(int customerId, int bookId, CancellationToken ct = default) =>
        dbContext.LibraryEntries.FirstOrDefaultAsync(e => e.CustomerId == customerId && e.BookId == bookId, ct);

    public async Task<IReadOnlyList<LibraryEntry>> ListByCustomerAsync(int customerId, CancellationToken ct = default) =>
        await dbContext.LibraryEntries.AsNoTracking().Where(e => e.CustomerId == customerId).ToListAsync(ct);

    public void Add(LibraryEntry entry) => dbContext.LibraryEntries.Add(entry);

    public void Remove(LibraryEntry entry) => dbContext.LibraryEntries.Remove(entry);

    public async Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default) =>
        await dbContext.LibraryEntries.Where(e => e.CustomerId == customerId).ExecuteDeleteAsync(ct);
}