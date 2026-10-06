using BookStore.Application.Abstractions.Queries;
using BookStore.Domain.Orders;
using BookStore.Domain.Returns;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Queries;

public sealed class ReportingQueries(BookStoreDbContext dbContext) : IReportingQueries
{
    private static readonly OrderStatus[] RevenueStatuses =
        [OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Delivered];

    public async Task<IReadOnlyList<RevenueOrderRow>> ListRevenueOrdersAsync(
        DateTimeOffset fromUtc, DateTimeOffset toUtcExclusive, CancellationToken ct = default) =>
        await dbContext.Orders
            .AsNoTracking()
            .Where(o => o.PaidAtUtc >= fromUtc && o.PaidAtUtc < toUtcExclusive
                        && RevenueStatuses.Contains(o.Status))
            .Select(o => new RevenueOrderRow(
    o.PaidAtUtc!.Value,
    // Partial returns leave the order Delivered, so their refunds must be
    // subtracted here. Full returns make the order Refunded, which the
    // status filter above already excludes: no double counting.
    o.Total.Amount - (dbContext.ReturnRequests
        .Where(r => r.OrderId == o.Id && r.Status == ReturnStatus.Completed)
        .Sum(r => (decimal?)r.RefundAmount.Amount) ?? 0m),
    o.ShippingAddress.CountryCode,
    o.Lines.Sum(l => l.Quantity)))
            .ToListAsync(ct);

    public async Task<IReadOnlyDictionary<OrderStatus, int>> CountOrdersByStatusAsync(CancellationToken ct = default)
    {
        var counts = await dbContext.Orders
            .AsNoTracking()
            .GroupBy(o => o.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        return counts.ToDictionary(x => x.Status, x => x.Count);
    }

    public async Task<IReadOnlyList<OrderExportRow>> ListOrdersForExportAsync(
        DateTimeOffset fromUtc, DateTimeOffset toUtcExclusive, CancellationToken ct = default) =>
        await dbContext.Orders
            .AsNoTracking()
            .Where(o => o.PaidAtUtc >= fromUtc && o.PaidAtUtc < toUtcExclusive)
            .OrderBy(o => o.PaidAtUtc)
            .Select(o => new OrderExportRow(
                o.OrderNumber, o.CreatedAtUtc, o.PaidAtUtc, o.Status,
                o.CustomerEmail, o.ShippingAddress.RecipientName, o.ShippingAddress.City,
                o.ShippingAddress.CountryCode, o.Lines.Sum(l => l.Quantity),
                o.Subtotal.Amount, o.DiscountAmount.Amount, o.ShippingCost.Amount, o.Total.Amount,
                o.Total.Currency, o.AppliedCouponCode, o.ShippingCarrier, o.TrackingNumber,
                    o.PaymentReference,
    dbContext.ReturnRequests
        .Where(r => r.OrderId == o.Id && r.Status == ReturnStatus.Completed)
        .Sum(r => (decimal?)r.RefundAmount.Amount) ?? 0m))
            .ToListAsync(ct);

    public Task<int> CountUnitsSoldAsync(int bookId, DateTimeOffset sinceUtc, CancellationToken ct = default) =>
    dbContext.Orders
        .AsNoTracking()
        .Where(o => RevenueStatuses.Contains(o.Status) && o.PaidAtUtc >= sinceUtc)
        .SelectMany(o => o.Lines)
        .Where(l => l.BookId == bookId)
        .SumAsync(l => (int?)l.Quantity ?? 0, ct);
}