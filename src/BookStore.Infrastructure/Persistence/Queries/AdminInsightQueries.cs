using BookStore.Application.Abstractions.Queries;
using BookStore.Domain.Orders;
using BookStore.Domain.Returns;
using BookStore.Domain.Reviews;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Queries;

public sealed class AdminInsightQueries(BookStoreDbContext dbContext) : IAdminInsightQueries
{
    public async Task<KpiRawData> GetKpiRawDataAsync(DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken ct = default)
    {
        // Sales = orders paid and not cancelled or refunded afterwards.
        OrderStatus[] sold = [OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Delivered];
        ReturnStatus[] counted = [ReturnStatus.Requested, ReturnStatus.Approved, ReturnStatus.Completed];

        // Two small columns per row: a bookstore's 60 days fit easily in memory,
        // and grouping by Istanbul day is simpler and exact there.
        var paid = await dbContext.Orders.AsNoTracking()
            .Where(o => sold.Contains(o.Status) && o.PaidAtUtc >= fromUtc && o.PaidAtUtc <= toUtc)
            .Select(o => new { PaidAtUtc = o.PaidAtUtc!.Value, Total = o.Total.Amount })
            .ToListAsync(ct);

        var deliveries = await dbContext.Orders.AsNoTracking()
            .Where(o => o.DeliveredAtUtc >= fromUtc && o.DeliveredAtUtc <= toUtc)
            .Select(o => o.DeliveredAtUtc!.Value)
            .ToListAsync(ct);

        var returns = await dbContext.ReturnRequests.AsNoTracking()
            .Where(r => counted.Contains(r.Status) && r.RequestedAtUtc >= fromUtc && r.RequestedAtUtc <= toUtc)
            .Select(r => r.RequestedAtUtc)
            .ToListAsync(ct);

        var refunds = await dbContext.ReturnRequests.AsNoTracking()
            .Where(r => r.Status == ReturnStatus.Completed && r.CompletedAtUtc >= fromUtc && r.CompletedAtUtc <= toUtc)
            .Select(r => new { CompletedAtUtc = r.CompletedAtUtc!.Value, Amount = r.RefundAmount.Amount })
            .ToListAsync(ct);

        return new KpiRawData(
            paid.Select(p => new PaidOrderPoint(p.PaidAtUtc, p.Total)).ToList(),
            deliveries,
            returns,
            refunds.Select(r => new RefundPoint(r.CompletedAtUtc, r.Amount)).ToList());
    }

    public async Task<IReadOnlyList<OrderHit>> SearchOrdersAsync(string term, int limit, CancellationToken ct = default)
    {
        var upper = term.ToUpperInvariant();
        var lower = term.ToLowerInvariant();

        return await dbContext.Orders.AsNoTracking()
            .Where(o => o.OrderNumber.Contains(upper)
                        || o.CustomerEmail.Contains(lower)
                        || o.ShippingAddress.RecipientName.Contains(term)
                        || o.TrackingNumber == term)
            .OrderByDescending(o => o.CreatedAtUtc)
            .Take(limit)
            .Select(o => new OrderHit(
                o.Id, o.OrderNumber, o.Status, o.Total.Amount, o.Total.Currency,
                o.CustomerEmail, o.ShippingAddress.RecipientName, o.CreatedAtUtc, o.PaidAtUtc))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<int>> SearchBookIdsAsync(
        string normalizedTerm, string rawTerm, int limit, CancellationToken ct = default)
    {
        // ISBNs are typed with or without dashes.
        var isbn = new string(rawTerm.Where(char.IsLetterOrDigit).ToArray());
        var hasText = normalizedTerm.Length > 0;

        // Hidden books included: the admin searches for those too.
        return await dbContext.Books.AsNoTracking()
            .Where(b => (hasText && b.SearchText.Contains(normalizedTerm)) || b.Isbn == isbn)
            .OrderByDescending(b => b.IsActive)
            .ThenBy(b => b.Title)
            .Select(b => b.Id)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ReturnHit>> SearchReturnsAsync(string term, int limit, CancellationToken ct = default)
    {
        var upper = term.ToUpperInvariant();
        var lower = term.ToLowerInvariant();

        return await dbContext.ReturnRequests.AsNoTracking()
            .Where(r => r.OrderNumber.Contains(upper) || r.CustomerEmail.Contains(lower))
            .OrderByDescending(r => r.RequestedAtUtc)
            .Take(limit)
            .Select(r => new ReturnHit(r.Id, r.OrderNumber, r.Status, r.CustomerEmail, r.RequestedAtUtc))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<CouponHit>> SearchCouponsAsync(string term, int limit, CancellationToken ct = default)
    {
        var upper = term.ToUpperInvariant();

        return await dbContext.Coupons.AsNoTracking()
            .Where(c => c.Code.Contains(upper))
            .OrderByDescending(c => c.IsActive)
            .ThenBy(c => c.Code)
            .Take(limit)
            .Select(c => new CouponHit(c.Id, c.Code, c.DiscountPercentage, c.IsActive, c.ExpiresAtUtc))
            .ToListAsync(ct);
    }

    public async Task<QuickViewCounts> GetQuickViewCountsAsync(DateTimeOffset lateBeforeUtc, CancellationToken ct = default)
    {
        var paid = dbContext.Orders.AsNoTracking().Where(o => o.Status == OrderStatus.Paid);

        return new QuickViewCounts(
            AwaitingShipment: await paid.CountAsync(ct),
            LateShipments: await paid.CountAsync(o => o.PaidAtUtc < lateBeforeUtc, ct),
            ReturnsToReview: await dbContext.ReturnRequests.CountAsync(r => r.Status == ReturnStatus.Requested, ct),
            ReturnsInTransit: await dbContext.ReturnRequests.CountAsync(r => r.Status == ReturnStatus.Approved, ct),
            PendingReviews: await dbContext.Reviews.CountAsync(r => r.Status == ReviewStatus.Pending, ct),
            // Same definition as Book.IsLowStock: active, available at or below its threshold.
            LowStock: await dbContext.Books.CountAsync(
                b => b.IsActive && b.StockQuantity - b.ReservedQuantity <= b.LowStockThreshold, ct));
    }

    public async Task<IReadOnlyList<OrderHit>> ListLateOrdersAsync(
        DateTimeOffset lateBeforeUtc, int limit, CancellationToken ct = default) =>
        await dbContext.Orders.AsNoTracking()
            .Where(o => o.Status == OrderStatus.Paid && o.PaidAtUtc < lateBeforeUtc)
            .OrderBy(o => o.PaidAtUtc) // longest waiting first
            .Take(limit)
            .Select(o => new OrderHit(
                o.Id, o.OrderNumber, o.Status, o.Total.Amount, o.Total.Currency,
                o.CustomerEmail, o.ShippingAddress.RecipientName, o.CreatedAtUtc, o.PaidAtUtc))
            .ToListAsync(ct);
}