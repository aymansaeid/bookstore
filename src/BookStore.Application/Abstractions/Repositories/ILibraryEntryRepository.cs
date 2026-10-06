using BookStore.Domain.Library;

namespace BookStore.Application.Abstractions.Repositories;

public interface ILibraryEntryRepository
{
    Task<LibraryEntry?> GetAsync(int customerId, int bookId, CancellationToken ct = default);
    Task<IReadOnlyList<LibraryEntry>> ListByCustomerAsync(int customerId, CancellationToken ct = default);
    void Add(LibraryEntry entry);
    void Remove(LibraryEntry entry);
    Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default);
}