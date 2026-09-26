using BookStore.Domain.Books;

namespace BookStore.Application.Abstractions.Repositories;

public interface IBookRepository
{
    Task<Book?> GetByIdAsync(int id, CancellationToken ct = default);

    /// <summary>
    /// Atomic conditional UPDATE — implemented in Infrastructure as
    /// ExecuteUpdateAsync, no load-then-save round trip. Only succeeds if
    /// (StockQuantity - ReservedQuantity) >= quantity at the moment the
    /// statement runs. This is what actually closes the double-sell race;
    /// everything upstream of this call is just orchestration.
    /// </summary>
    Task<bool> TryReserveStockAsync(int bookId, int quantity, CancellationToken ct = default);

    Task ReleaseReservationAsync(int bookId, int quantity, CancellationToken ct = default);

    Task ConfirmSaleAsync(int bookId, int quantity, CancellationToken ct = default);

    void Add(Book book);
    Task<IReadOnlyList<Book>> ListAsync(bool includeInactive, CancellationToken ct = default);
    Task<bool> IsbnExistsAsync(string isbn, int? excludeBookId, CancellationToken ct = default);

    /// Returns sold-but-never-shipped units to stock (cancelling a paid order).
    Task RestockAsync(int bookId, int quantity, CancellationToken ct = default);
    Task<Book?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default);
    Task<IReadOnlyList<Book>> ListByIdsAsync(IReadOnlyCollection<int> ids, CancellationToken ct = default);
    Task SetLowStockAlertedAsync(int bookId, DateTimeOffset? alertedAtUtc, CancellationToken ct = default);
}