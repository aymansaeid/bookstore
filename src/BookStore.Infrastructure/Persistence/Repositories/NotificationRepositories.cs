using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Notifications;
using BookStore.Domain.Wishlists;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class StockNotificationRepository(BookStoreDbContext dbContext) : IStockNotificationRepository
{
    public Task<StockNotification?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default) =>
        dbContext.StockNotifications.FirstOrDefaultAsync(n => n.ConfirmationTokenHash == tokenHash, ct);

    public Task<StockNotification?> GetByBookAndEmailAsync(int bookId, string email, CancellationToken ct = default)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return dbContext.StockNotifications
            .FirstOrDefaultAsync(n => n.BookId == bookId && n.Email == normalized, ct);
    }

    public async Task<IReadOnlyList<StockNotification>> ListAwaitingNotificationAsync(
        int bookId, CancellationToken ct = default) =>
        await dbContext.StockNotifications
            .Where(n => n.BookId == bookId && n.IsConfirmed && n.NotifiedAtUtc == null)
            .ToListAsync(ct);

    public Task<int> CountAwaitingNotificationAsync(int bookId, CancellationToken ct = default) =>
        dbContext.StockNotifications
            .CountAsync(n => n.BookId == bookId && n.IsConfirmed && n.NotifiedAtUtc == null, ct);

    public void Add(StockNotification notification) => dbContext.StockNotifications.Add(notification);
}

public sealed class WishlistRepository(BookStoreDbContext dbContext) : IWishlistRepository
{
    public async Task<IReadOnlyList<WishlistItem>> ListByCustomerAsync(int customerId, CancellationToken ct = default) =>
        await dbContext.WishlistItems
            .AsNoTracking()
            .Where(w => w.CustomerId == customerId)
            .OrderByDescending(w => w.AddedAtUtc)
            .ToListAsync(ct);

    public Task<bool> ExistsAsync(int customerId, int bookId, CancellationToken ct = default) =>
        dbContext.WishlistItems.AnyAsync(w => w.CustomerId == customerId && w.BookId == bookId, ct);

    public Task<WishlistItem?> GetAsync(int customerId, int bookId, CancellationToken ct = default) =>
        dbContext.WishlistItems.FirstOrDefaultAsync(w => w.CustomerId == customerId && w.BookId == bookId, ct);

    public void Add(WishlistItem item) => dbContext.WishlistItems.Add(item);

    public void Remove(WishlistItem item) => dbContext.WishlistItems.Remove(item);
}