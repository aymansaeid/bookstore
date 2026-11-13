using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Books;
using BookStore.Application.Common;
using BookStore.Domain.Common;
using BookStore.Domain.Orders;
using BookStore.Domain.Returns;
using FluentValidation;

namespace BookStore.Application.Admin.Insights;

public sealed record AdminSearchOrderDto(
    int Id, string OrderNumber, OrderStatus Status, decimal Total, string Currency,
    string CustomerEmail, string RecipientName, DateTimeOffset CreatedAtUtc, DateTimeOffset? PaidAtUtc);

public sealed record AdminSearchCustomerDto(int Id, string FullName, string Email, string? Phone, bool IsActive, int OrderCount);

public sealed record AdminSearchBookDto(
    int Id, string Title, string Author, string Slug, bool IsActive, int AvailableToSell,
    decimal Price, string Currency, string? CoverThumbnailUrl);

public sealed record AdminSearchReturnDto(int Id, string OrderNumber, ReturnStatus Status, string CustomerEmail, DateTimeOffset RequestedAtUtc);

public sealed record AdminSearchCouponDto(int Id, string Code, int DiscountPercentage, bool IsActive, DateTimeOffset ExpiresAtUtc);

public sealed record AdminQuickViewsDto(
    int AwaitingShipment,
    int LateShipments,
    int ReturnsToReview,
    int ReturnsInTransit,
    int PendingReviews,
    int LowStock,
    IReadOnlyList<AdminSearchOrderDto> LateOrders);

public sealed record AdminSearchResultDto(
    string? Query,
    IReadOnlyList<AdminSearchOrderDto> Orders,
    IReadOnlyList<AdminSearchCustomerDto> Customers,
    IReadOnlyList<AdminSearchBookDto> Books,
    IReadOnlyList<AdminSearchReturnDto> Returns,
    IReadOnlyList<AdminSearchCouponDto> Coupons,
    AdminQuickViewsDto? QuickViews);

public sealed record AdminSearchQuery(string? Q) : IQuery<AdminSearchResultDto>;

public sealed class AdminSearchQueryValidator : AbstractValidator<AdminSearchQuery>
{
    public AdminSearchQueryValidator()
    {
        RuleFor(x => x.Q).MaximumLength(100);
    }
}

public sealed class AdminSearchQueryHandler(
    IAdminInsightQueries insights,
    IAdminCustomerQueries customerQueries,
    IBookRepository bookRepository,
    IFileStorage fileStorage)
    : IQueryHandler<AdminSearchQuery, AdminSearchResultDto>
{
    private const int PerGroup = 5;
    private const int MinQueryLength = 2;

    /// "Late" = paid this long ago and still not shipped.
    private static readonly TimeSpan LateAfter = TimeSpan.FromHours(48);

    public async Task<Result<AdminSearchResultDto>> Handle(AdminSearchQuery query, CancellationToken ct)
    {
        var term = query.Q?.Trim() ?? string.Empty;

        // Empty box: what needs attention now, instead of results.
        if (term.Length < MinQueryLength)
            return Result.Success(new AdminSearchResultDto(null, [], [], [], [], [], await QuickViewsAsync(ct)));

        var orders = await insights.SearchOrdersAsync(term, PerGroup, ct);

        // Same matching as the customers page, so results never disagree.
        var customers = await customerQueries.ListAsync(
            new AdminCustomerListFilter(term, null, AdminCustomerSort.RecentlyActive, 1, PerGroup), ct);

        var bookIds = await insights.SearchBookIdsAsync(SearchNormalizer.Normalize(term), term, PerGroup, ct);
        var books = bookIds.Count == 0 ? [] : await bookRepository.ListByIdsAsync(bookIds, ct);
        var booksById = books.ToDictionary(b => b.Id);

        var returns = await insights.SearchReturnsAsync(term, PerGroup, ct);
        var coupons = await insights.SearchCouponsAsync(term, PerGroup, ct);

        return Result.Success(new AdminSearchResultDto(
            term,
            orders.Select(ToDto).ToList(),
            customers.Items.Select(c => new AdminSearchCustomerDto(
                c.Id, $"{c.FirstName} {c.LastName}".Trim(), c.Email, c.Phone, c.IsActive, c.OrderCount)).ToList(),
            bookIds.Where(booksById.ContainsKey).Select(id => booksById[id]).Select(b => new AdminSearchBookDto(
                b.Id, b.Title, b.Author, b.Slug.Value, b.IsActive, b.AvailableToSell,
                b.Price.Amount, b.Price.Currency, BookMappings.CoverThumbnailUrl(b, fileStorage))).ToList(),
            returns.Select(r => new AdminSearchReturnDto(r.Id, r.OrderNumber, r.Status, r.CustomerEmail, r.RequestedAtUtc)).ToList(),
            coupons.Select(c => new AdminSearchCouponDto(c.Id, c.Code, c.DiscountPercentage, c.IsActive, c.ExpiresAtUtc)).ToList(),
            QuickViews: null));
    }

    private async Task<AdminQuickViewsDto> QuickViewsAsync(CancellationToken ct)
    {
        var lateBefore = DateTimeOffset.UtcNow - LateAfter;
        var counts = await insights.GetQuickViewCountsAsync(lateBefore, ct);
        var late = await insights.ListLateOrdersAsync(lateBefore, PerGroup, ct);

        return new AdminQuickViewsDto(
            counts.AwaitingShipment, counts.LateShipments, counts.ReturnsToReview,
            counts.ReturnsInTransit, counts.PendingReviews, counts.LowStock,
            late.Select(ToDto).ToList());
    }

    private static AdminSearchOrderDto ToDto(OrderHit o) =>
        new(o.Id, o.OrderNumber, o.Status, o.Total, o.Currency, o.CustomerEmail, o.RecipientName, o.CreatedAtUtc, o.PaidAtUtc);
}