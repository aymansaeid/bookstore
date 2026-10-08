using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
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

    public async Task<IReadOnlyList<int>> ListCustomerIdsByBookAsync(int bookId, CancellationToken ct = default) =>
        await dbContext.WishlistItems.Where(w => w.BookId == bookId).Select(w => w.CustomerId).ToListAsync(ct);

    public async Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default) =>
        await dbContext.WishlistItems.Where(w => w.CustomerId == customerId).ExecuteDeleteAsync(ct);
}

public sealed class NotificationRepository(BookStoreDbContext dbContext) : INotificationRepository
{
    public async Task<IReadOnlySet<int>> CustomersWithKeyAsync(
        string dedupKey, IReadOnlyCollection<int> customerIds, CancellationToken ct = default) =>
        (await dbContext.Notifications
            .Where(n => n.DedupKey == dedupKey && customerIds.Contains(n.CustomerId))
            .Select(n => n.CustomerId)
            .ToListAsync(ct))
        .ToHashSet();

    public void AddRange(IEnumerable<Notification> notifications) => dbContext.Notifications.AddRange(notifications);

    public async Task<PagedResult<Notification>> ListAsync(
        int customerId, bool unreadOnly, int page, int pageSize, CancellationToken ct = default)
    {
        var query = dbContext.Notifications.AsNoTracking().Where(n => n.CustomerId == customerId);
        if (unreadOnly)
            query = query.Where(n => n.ReadAtUtc == null);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(n => n.CreatedAtUtc)
            .ThenByDescending(n => n.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<Notification>(items, page, pageSize, total);
    }

    public Task<int> CountUnreadAsync(int customerId, CancellationToken ct = default) =>
        dbContext.Notifications.CountAsync(n => n.CustomerId == customerId && n.ReadAtUtc == null, ct);

    public Task<Notification?> GetAsync(int notificationId, int customerId, CancellationToken ct = default) =>
        dbContext.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId && n.CustomerId == customerId, ct);

    public async Task MarkAllReadAsync(int customerId, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        await dbContext.Notifications
            .Where(n => n.CustomerId == customerId && n.ReadAtUtc == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(n => n.ReadAtUtc, now), ct);
    }

    public async Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default) =>
        await dbContext.Notifications.Where(n => n.CustomerId == customerId).ExecuteDeleteAsync(ct);
}

public sealed class MuhaqqiqFollowRepository(BookStoreDbContext dbContext) : IMuhaqqiqFollowRepository
{
    public Task<MuhaqqiqFollow?> GetAsync(int customerId, int muhaqqiqId, CancellationToken ct = default) =>
        dbContext.MuhaqqiqFollows.FirstOrDefaultAsync(f => f.CustomerId == customerId && f.MuhaqqiqId == muhaqqiqId, ct);

    public async Task<IReadOnlyList<MuhaqqiqFollow>> ListByCustomerAsync(int customerId, CancellationToken ct = default) =>
        await dbContext.MuhaqqiqFollows.AsNoTracking().Where(f => f.CustomerId == customerId).ToListAsync(ct);

    public async Task<IReadOnlyList<int>> ListFollowerIdsAsync(int muhaqqiqId, CancellationToken ct = default) =>
        await dbContext.MuhaqqiqFollows.Where(f => f.MuhaqqiqId == muhaqqiqId).Select(f => f.CustomerId).ToListAsync(ct);

    public Task<int> CountByCustomerAsync(int customerId, CancellationToken ct = default) =>
        dbContext.MuhaqqiqFollows.CountAsync(f => f.CustomerId == customerId, ct);

    public void Add(MuhaqqiqFollow follow) => dbContext.MuhaqqiqFollows.Add(follow);

    public void Remove(MuhaqqiqFollow follow) => dbContext.MuhaqqiqFollows.Remove(follow);

    public async Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default) =>
        await dbContext.MuhaqqiqFollows.Where(f => f.CustomerId == customerId).ExecuteDeleteAsync(ct);
}