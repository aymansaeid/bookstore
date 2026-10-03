using BookStore.Application.Abstractions.Queries;
using BookStore.Domain.Books;
using BookStore.Domain.Orders;
using BookStore.Domain.Reviews;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Queries;

public sealed class CatalogSearch(BookStoreDbContext dbContext, TimeProvider timeProvider) : ICatalogSearch
{
    private static readonly OrderStatus[] SoldStatuses = [OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Delivered];
    private static readonly TimeSpan BestsellerWindow = TimeSpan.FromDays(90);

    /// Which filter a facet leaves out, so its counts show what the customer
    /// WOULD get by changing that one filter.
    private enum FacetExclusion { None, Category, Muhaqqiq, Level, Price, InStock }

    public async Task<(IReadOnlyList<Book> Items, int TotalCount)> SearchAsync(
        CatalogSearchFilter filter, CancellationToken ct = default)
    {
        var query = Filtered(filter, FacetExclusion.None);

        var totalCount = await query.CountAsync(ct);

        var items = await Sorted(query, filter)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<CatalogFacetCounts> GetFacetsAsync(CatalogSearchFilter filter, CancellationToken ct = default)
    {
        var categories = await Filtered(filter, FacetExclusion.Category)
            .Where(b => b.CategoryId != null)
            .GroupBy(b => b.CategoryId!.Value)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count, ct);

        var muhaqqiqs = await Filtered(filter, FacetExclusion.Muhaqqiq)
            .SelectMany(b => b.Muhaqqiqs)
            .GroupBy(link => link.MuhaqqiqId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count, ct);

        var levels = await Filtered(filter, FacetExclusion.Level)
            .Where(b => b.Level != null)
            .GroupBy(b => b.Level!.Value)
            .Select(g => new { Level = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Level, x => x.Count, ct);

        // Bounds for the price slider, from results that ignore the current
        // price selection (otherwise the slider could never widen again).
        var priceScope = Filtered(filter, FacetExclusion.Price);
        var minPrice = await priceScope.MinAsync(b => (decimal?)b.Price.Amount, ct);
        var maxPrice = await priceScope.MaxAsync(b => (decimal?)b.Price.Amount, ct);

        var inStock = await Filtered(filter, FacetExclusion.InStock)
            .CountAsync(b => b.StockQuantity - b.ReservedQuantity > 0, ct);

        return new CatalogFacetCounts(categories, muhaqqiqs, levels, minPrice, maxPrice, inStock);
    }

    private IQueryable<Book> Filtered(CatalogSearchFilter f, FacetExclusion exclude)
    {
        var query = dbContext.Books.AsNoTracking().Where(b => b.IsActive);

        // Every word must match: in the book's own text, OR through a
        // category or muhaqqiq whose name contains it.
        foreach (var term in f.Terms)
        {
            var text = term.Text;
            var categoryIds = term.MatchingCategoryIds;
            var muhaqqiqIds = term.MatchingMuhaqqiqIds;

            query = query.Where(b =>
                b.SearchText.Contains(text)
                || (b.CategoryId != null && categoryIds.Contains(b.CategoryId.Value))
                || b.Muhaqqiqs.Any(link => muhaqqiqIds.Contains(link.MuhaqqiqId)));
        }

        if (exclude != FacetExclusion.Category && f.CategoryIds is { Count: > 0 } categoryFilter)
            query = query.Where(b => b.CategoryId != null && categoryFilter.Contains(b.CategoryId.Value));

        if (exclude != FacetExclusion.Muhaqqiq && f.MuhaqqiqIds is { Count: > 0 } muhaqqiqFilter)
            query = query.Where(b => b.Muhaqqiqs.Any(link => muhaqqiqFilter.Contains(link.MuhaqqiqId)));

        if (exclude != FacetExclusion.Level && f.Levels is { Count: > 0 } levels)
            query = query.Where(b => b.Level != null && levels.Contains(b.Level.Value));

        if (exclude != FacetExclusion.Price)
        {
            if (f.MinPrice is { } min)
                query = query.Where(b => b.Price.Amount >= min);
            if (f.MaxPrice is { } max)
                query = query.Where(b => b.Price.Amount <= max);
        }

        // A book with no volume count is a single volume.
        if (f.MinVolumes is { } minVolumes)
            query = query.Where(b => (b.Volumes ?? 1) >= minVolumes);
        if (f.MaxVolumes is { } maxVolumes)
            query = query.Where(b => (b.Volumes ?? 1) <= maxVolumes);

        if (exclude != FacetExclusion.InStock && f.InStockOnly)
            query = query.Where(b => b.StockQuantity - b.ReservedQuantity > 0);

        if (f.InstallmentsOnly)
            query = query.Where(b => b.InstallmentsAllowed);

        if (f.Badge is { } badge)
            query = query.Where(b => (b.Badges & badge) == badge);

        return query;
    }

    private IQueryable<Book> Sorted(IQueryable<Book> query, CatalogSearchFilter f)
    {
        var soldSince = timeProvider.GetUtcNow() - BestsellerWindow;

        IOrderedQueryable<Book> ordered = f.Sort switch
        {
            CatalogSort.Relevance when f.Phrase is { } phrase => query
                .OrderByDescending(b =>
                    b.SearchTitle == phrase ? 4
                    : b.SearchTitle.StartsWith(phrase) ? 3
                    : b.SearchTitle.Contains(phrase) ? 2
                    : 1)
                .ThenByDescending(b => dbContext.Orders
                    .Where(o => SoldStatuses.Contains(o.Status) && o.PaidAtUtc >= soldSince)
                    .SelectMany(o => o.Lines)
                    .Where(l => l.BookId == b.Id)
                    .Sum(l => (int?)l.Quantity) ?? 0),

            CatalogSort.Newest => query.OrderByDescending(b => b.Id),

            CatalogSort.PriceAsc => query.OrderBy(b => b.Price.Amount),

            CatalogSort.PriceDesc => query.OrderByDescending(b => b.Price.Amount),

            CatalogSort.TopRated => query
                .OrderByDescending(b => dbContext.Reviews
                    .Where(r => r.BookId == b.Id && r.Status == ReviewStatus.Approved)
                    .Average(r => (double?)r.Rating) ?? 0)
                .ThenByDescending(b => dbContext.Reviews
                    .Count(r => r.BookId == b.Id && r.Status == ReviewStatus.Approved)),

            // Bestselling, and Relevance with no search word.
            _ => query.OrderByDescending(b => dbContext.Orders
                .Where(o => SoldStatuses.Contains(o.Status) && o.PaidAtUtc >= soldSince)
                .SelectMany(o => o.Lines)
                .Where(l => l.BookId == b.Id)
                .Sum(l => (int?)l.Quantity) ?? 0)
        };

        // Id as the final tie-breaker: without it, books with equal sort
        // values can shuffle between pages and appear twice or not at all.
        return ordered.ThenBy(b => b.Id);
    }
}