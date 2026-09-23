using BookStore.Domain.Notifications;

namespace BookStore.Application.Abstractions.Repositories;

public interface IStockNotificationRepository
{
    Task<StockNotification?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task<StockNotification?> GetByBookAndEmailAsync(int bookId, string email, CancellationToken ct = default);

    /// Everyone confirmed and not yet notified for this book.
    Task<IReadOnlyList<StockNotification>> ListAwaitingNotificationAsync(int bookId, CancellationToken ct = default);

    Task<int> CountAwaitingNotificationAsync(int bookId, CancellationToken ct = default);

    void Add(StockNotification notification);
}