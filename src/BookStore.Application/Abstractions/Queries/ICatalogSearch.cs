using BookStore.Domain.Books;

namespace BookStore.Application.Abstractions.Queries;

public enum CatalogSort
{
    Relevance = 0,
    Bestselling = 1,
    Newest = 2,
    PriceAsc = 3,
    PriceDesc = 4,
    TopRated = 5
}

/// One search word, plus the categories and muhaqqiqs whose NAMES contain
/// it. A book matches the word if any of the three applies.
public sealed record SearchTerm(
    string Text,
    IReadOnlyCollection<int> MatchingCategoryIds,
    IReadOnlyCollection<int> MatchingMuhaqqiqIds);

public sealed record CatalogSearchFilter(
    string? Phrase,
    IReadOnlyList<SearchTerm> Terms,
    IReadOnlyCollection<int>? CategoryIds,
    IReadOnlyCollection<int>? MuhaqqiqIds,
    IReadOnlyCollection<ReaderLevel>? Levels,
    decimal? MinPrice,
    decimal? MaxPrice,
    int? MinVolumes,
    int? MaxVolumes,
    bool InStockOnly,
    bool InstallmentsOnly,
    BookBadges? Badge,
    CatalogSort Sort,
    int Page,
    int PageSize);

public sealed record CatalogFacetCounts(
    IReadOnlyDictionary<int, int> Categories,
    IReadOnlyDictionary<int, int> Muhaqqiqs,
    IReadOnlyDictionary<ReaderLevel, int> Levels,
    decimal? MinPrice,
    decimal? MaxPrice,
    int InStock);

public interface ICatalogSearch
{
    Task<(IReadOnlyList<Book> Items, int TotalCount)> SearchAsync(CatalogSearchFilter filter, CancellationToken ct = default);

    Task<CatalogFacetCounts> GetFacetsAsync(CatalogSearchFilter filter, CancellationToken ct = default);
}