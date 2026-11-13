using BookStore.Domain.Orders;
using BookStore.Domain.Returns;

namespace BookStore.Application.Abstractions.Queries;

public sealed record PaidOrderPoint(DateTimeOffset PaidAtUtc, decimal Total);
public sealed record RefundPoint(DateTimeOffset CompletedAtUtc, decimal Amount);

public sealed record KpiRawData(
    IReadOnlyList<PaidOrderPoint> PaidOrders,
    IReadOnlyList<DateTimeOffset> Deliveries,
    IReadOnlyList<DateTimeOffset> ReturnRequests,
    IReadOnlyList<RefundPoint> Refunds);

public sealed record OrderHit(
    int Id, string OrderNumber, OrderStatus Status, decimal Total, string Currency,
    string CustomerEmail, string RecipientName, DateTimeOffset CreatedAtUtc, DateTimeOffset? PaidAtUtc);

public sealed record ReturnHit(int Id, string OrderNumber, ReturnStatus Status, string CustomerEmail, DateTimeOffset RequestedAtUtc);

public sealed record CouponHit(int Id, string Code, int DiscountPercentage, bool IsActive, DateTimeOffset ExpiresAtUtc);

public sealed record QuickViewCounts(
    int AwaitingShipment, int LateShipments, int ReturnsToReview, int ReturnsInTransit, int PendingReviews, int LowStock);

public interface IAdminInsightQueries
{
    /// Everything the KPI cards need between two instants, as raw points:
    /// grouping by local day happens in the application, in store time.
    Task<KpiRawData> GetKpiRawDataAsync(DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken ct = default);

    Task<IReadOnlyList<OrderHit>> SearchOrdersAsync(string term, int limit, CancellationToken ct = default);
    Task<IReadOnlyList<int>> SearchBookIdsAsync(string normalizedTerm, string rawTerm, int limit, CancellationToken ct = default);
    Task<IReadOnlyList<ReturnHit>> SearchReturnsAsync(string term, int limit, CancellationToken ct = default);
    Task<IReadOnlyList<CouponHit>> SearchCouponsAsync(string term, int limit, CancellationToken ct = default);

    Task<QuickViewCounts> GetQuickViewCountsAsync(DateTimeOffset lateBeforeUtc, CancellationToken ct = default);
    Task<IReadOnlyList<OrderHit>> ListLateOrdersAsync(DateTimeOffset lateBeforeUtc, int limit, CancellationToken ct = default);
}