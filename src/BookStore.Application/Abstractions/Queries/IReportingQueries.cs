using BookStore.Domain.Orders;

namespace BookStore.Application.Abstractions.Queries;

public sealed record RevenueOrderRow(DateTimeOffset PaidAtUtc, decimal Total, string CountryCode, int Units);

public sealed record OrderExportRow(
    string OrderNumber, DateTimeOffset CreatedAtUtc, DateTimeOffset? PaidAtUtc, OrderStatus Status,
    string CustomerEmail, string RecipientName, string City, string CountryCode, int ItemCount,
    decimal Subtotal, decimal Discount, decimal Shipping, decimal Total, string Currency,
    string? CouponCode, string? Carrier, string? TrackingNumber, string? PaymentReference);

public interface IReportingQueries
{
    /// Orders that count as revenue (paid, not later cancelled/refunded),
    /// paid within [fromUtc, toUtcExclusive).
    Task<IReadOnlyList<RevenueOrderRow>> ListRevenueOrdersAsync(
        DateTimeOffset fromUtc, DateTimeOffset toUtcExclusive, CancellationToken ct = default);

    Task<IReadOnlyDictionary<OrderStatus, int>> CountOrdersByStatusAsync(CancellationToken ct = default);

    /// Every order paid in the range, whatever its status now, so the
    /// accountant sees refunds and cancellations too.
    Task<IReadOnlyList<OrderExportRow>> ListOrdersForExportAsync(
        DateTimeOffset fromUtc, DateTimeOffset toUtcExclusive, CancellationToken ct = default);
}