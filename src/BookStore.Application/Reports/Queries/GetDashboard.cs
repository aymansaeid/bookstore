using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Shipping;
using BookStore.Domain.Orders;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Reports.Queries;

public sealed record GetDashboardQuery(DateOnly? From, DateOnly? To) : IQuery<DashboardDto>;

public sealed class GetDashboardQueryValidator : AbstractValidator<GetDashboardQuery>
{
    public GetDashboardQueryValidator()
    {
        RuleFor(x => x)
            .Must(x => x.From is null || x.To is null || x.From <= x.To)
            .WithMessage("'from' must be on or before 'to'.");

        RuleFor(x => x)
            .Must(x => x.From is null || x.To is null || x.To.Value.DayNumber - x.From.Value.DayNumber <= 366)
            .WithMessage("The range can be at most one year.");
    }
}

public sealed class GetDashboardQueryHandler(
    IReportingQueries reporting,
    IBookRepository bookRepository,
    IStockNotificationRepository notificationRepository,
    IOptions<StoreOptions> storeOptions)
    : IQueryHandler<GetDashboardQuery, DashboardDto>
{
    public async Task<Result<DashboardDto>> Handle(GetDashboardQuery query, CancellationToken ct)
    {
        var store = storeOptions.Value;
        var clock = new StoreTimeZone(store.TimeZoneId);

        // Default: the last 30 days, including today, in the store's zone.
        var to = query.To ?? clock.Today;
        var from = query.From ?? to.AddDays(-29);
        var (fromUtc, toUtcExclusive) = clock.ToUtcRange(from, to);

        var orders = await reporting.ListRevenueOrdersAsync(fromUtc, toUtcExclusive, ct);

        var revenue = orders.Sum(o => o.Total);
        var paidOrders = orders.Count;
        var average = paidOrders == 0 ? 0m : Math.Round(revenue / paidOrders, 2, MidpointRounding.ToEven);

        var byDay = orders
            .GroupBy(o => clock.ToLocalDate(o.PaidAtUtc))
            .ToDictionary(g => g.Key, g => (Revenue: g.Sum(o => o.Total), Orders: g.Count()));

        // Every day in the range, zeros included, so a chart has no gaps.
        var daily = Enumerable.Range(0, to.DayNumber - from.DayNumber + 1)
            .Select(offset => from.AddDays(offset))
            .Select(day => byDay.TryGetValue(day, out var v)
                ? new DailyRevenueDto(day, v.Revenue, v.Orders)
                : new DailyRevenueDto(day, 0m, 0))
            .ToList();

        var topCountries = orders
            .GroupBy(o => o.CountryCode)
            .Select(g => new CountryBreakdownDto(g.Key, CountryCodes.GetEnglishName(g.Key), g.Count(), g.Sum(o => o.Total)))
            .OrderByDescending(c => c.Revenue)
            .Take(10)
            .ToList();

        var statusCounts = await reporting.CountOrdersByStatusAsync(ct);

        var books = await bookRepository.ListAsync(includeInactive: false, ct);
        var lowStock = new List<LowStockBookDto>();
        foreach (var book in books.Where(b => b.IsLowStock).OrderBy(b => b.AvailableToSell))
        {
            var waiting = await notificationRepository.CountAwaitingNotificationAsync(book.Id, ct);
            lowStock.Add(new LowStockBookDto(book.Id, book.Title, book.AvailableToSell, book.LowStockThreshold, waiting));
        }

        return Result.Success(new DashboardDto(
            from, to, store.Currency,
            revenue, paidOrders, average, orders.Sum(o => o.Units),
            statusCounts.GetValueOrDefault(OrderStatus.Paid),
            statusCounts.ToDictionary(kv => kv.Key.ToString(), kv => kv.Value),
            daily, topCountries, lowStock));
    }
}