using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Common;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Admin.Insights;

public sealed record KpiPointDto(DateOnly Date, decimal Value);

/// ChangePercent: relative change against the previous period of the same
/// length; null when the previous value was 0 (no meaningful percentage).
public sealed record KpiCardDto(decimal Value, decimal Previous, decimal? ChangePercent, IReadOnlyList<KpiPointDto> Series);

public sealed record AdminKpisDto(
    int PeriodDays,
    DateOnly FromDate,
    DateOnly ToDate,
    string Currency,
    KpiCardDto Revenue,
    KpiCardDto Orders,
    KpiCardDto AverageOrderValue,
    KpiCardDto ReturnRate,
    decimal RefundedAmount,
    decimal? SalesViaEfendiPercent);

/// Pure calculation on local dates, so the rules are unit-tested without a
/// database or a clock.
public static class KpiCalculator
{
    public static AdminKpisDto Build(
        int days,
        DateOnly today,
        string currency,
        IReadOnlyList<(DateOnly Date, decimal Total)> sales,
        IReadOnlyList<DateOnly> deliveries,
        IReadOnlyList<DateOnly> returnRequests,
        IReadOnlyList<(DateOnly Date, decimal Amount)> refunds)
    {
        var from = today.AddDays(-(days - 1));
        var prevFrom = from.AddDays(-days);
        var prevTo = from.AddDays(-1);

        bool Current(DateOnly d) => d >= from && d <= today;
        bool Previous(DateOnly d) => d >= prevFrom && d <= prevTo;

        var revenue = sales.Where(s => Current(s.Date)).Sum(s => s.Total);
        var prevRevenue = sales.Where(s => Previous(s.Date)).Sum(s => s.Total);
        var orders = sales.Count(s => Current(s.Date));
        var prevOrders = sales.Count(s => Previous(s.Date));

        var dates = Enumerable.Range(0, days).Select(i => from.AddDays(i)).ToList();
        var salesByDay = sales.Where(s => Current(s.Date)).GroupBy(s => s.Date)
            .ToDictionary(g => g.Key, g => (Total: g.Sum(x => x.Total), Count: g.Count()));
        var returnsByDay = returnRequests.Where(Current).GroupBy(d => d).ToDictionary(g => g.Key, g => g.Count());

        return new AdminKpisDto(
            days, from, today, currency,
            Card(Round2(revenue), Round2(prevRevenue),
                dates.Select(d => new KpiPointDto(d, Round2(salesByDay.GetValueOrDefault(d).Total))).ToList()),
            Card(orders, prevOrders,
                dates.Select(d => new KpiPointDto(d, salesByDay.GetValueOrDefault(d).Count)).ToList()),
            Card(Average(revenue, orders), Average(prevRevenue, prevOrders),
                dates.Select(d =>
                {
                    var day = salesByDay.GetValueOrDefault(d);
                    return new KpiPointDto(d, Average(day.Total, day.Count));
                }).ToList()),
            Card(Rate(returnRequests.Count(Current), deliveries.Count(Current)),
                Rate(returnRequests.Count(Previous), deliveries.Count(Previous)),
                dates.Select(d => new KpiPointDto(d, returnsByDay.GetValueOrDefault(d))).ToList()),
            Round2(refunds.Where(r => Current(r.Date)).Sum(r => r.Amount)),
            SalesViaEfendiPercent: null);
    }

    private static KpiCardDto Card(decimal value, decimal previous, IReadOnlyList<KpiPointDto> series) =>
        new(value, previous,
            previous == 0 ? null : Math.Round((value - previous) / previous * 100, 1, MidpointRounding.AwayFromZero),
            series);

    private static decimal Average(decimal total, int count) => count == 0 ? 0 : Round2(total / count);

    /// Return requests per 100 delivered orders, one decimal.
    private static decimal Rate(int returns, int delivered) =>
        delivered == 0 ? 0 : Math.Round((decimal)returns / delivered * 100, 1, MidpointRounding.AwayFromZero);

    private static decimal Round2(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}

public sealed record GetAdminKpisQuery(int Days = 30) : IQuery<AdminKpisDto>;

public sealed class GetAdminKpisQueryValidator : AbstractValidator<GetAdminKpisQuery>
{
    public GetAdminKpisQueryValidator()
    {
        RuleFor(x => x.Days).InclusiveBetween(7, 90);
    }
}

public sealed class GetAdminKpisQueryHandler(IAdminInsightQueries queries, IOptions<StoreOptions> storeOptions)
    : IQueryHandler<GetAdminKpisQuery, AdminKpisDto>
{
    public async Task<Result<AdminKpisDto>> Handle(GetAdminKpisQuery query, CancellationToken ct)
    {
        var store = storeOptions.Value;
        var zone = TimeZoneInfo.FindSystemTimeZoneById(store.TimeZoneId);
        var nowUtc = DateTimeOffset.UtcNow;

        DateOnly LocalDate(DateTimeOffset utc) => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(utc, zone).DateTime);

        // Days are store days (Istanbul), not UTC days: an order paid at
        // 01:30 local time belongs to that local day.
        var today = LocalDate(nowUtc);
        var previousStart = today.AddDays(-(2 * query.Days - 1));
        var previousStartLocal = previousStart.ToDateTime(TimeOnly.MinValue);
        var fromUtc = new DateTimeOffset(previousStartLocal, zone.GetUtcOffset(previousStartLocal)).ToUniversalTime();

        var raw = await queries.GetKpiRawDataAsync(fromUtc, nowUtc, ct);

        return Result.Success(KpiCalculator.Build(
            query.Days, today, store.Currency,
            raw.PaidOrders.Select(p => (LocalDate(p.PaidAtUtc), p.Total)).ToList(),
            raw.Deliveries.Select(LocalDate).ToList(),
            raw.ReturnRequests.Select(LocalDate).ToList(),
            raw.Refunds.Select(r => (LocalDate(r.CompletedAtUtc), r.Amount)).ToList()));
    }
}