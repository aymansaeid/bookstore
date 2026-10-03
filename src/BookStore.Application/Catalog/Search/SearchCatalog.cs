using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Reviews.Queries;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Books;
using BookStore.Application.Common;
using BookStore.Domain.Books;
using BookStore.Domain.Catalog;
using FluentValidation;

namespace BookStore.Application.Catalog.Search;

public sealed record FacetCountDto(int Id, string Slug, string Name, int Count);

public sealed record CategoryFacetDto(int Id, string Slug, string Name, int Count, IReadOnlyList<FacetCountDto> Children);

public sealed record LevelFacetDto(ReaderLevel Level, int Count);

public sealed record CatalogFacetsDto(
    IReadOnlyList<CategoryFacetDto> Categories,
    IReadOnlyList<FacetCountDto> Muhaqqiqs,
    IReadOnlyList<LevelFacetDto> Levels,
    decimal? MinPrice,
    decimal? MaxPrice,
    int InStockCount);

public sealed record CatalogSearchResultDto(
    PagedResult<PublicBookDto> Results,
    CatalogFacetsDto? Facets,
    IReadOnlyList<string> SearchedTerms,
    CatalogSort Sort);

public sealed record SearchCatalogQuery(
    string? Q,
    string? Category,
    IReadOnlyList<string>? Muhaqqiqs,
    IReadOnlyList<ReaderLevel>? Levels,
    decimal? MinPrice,
    decimal? MaxPrice,
    int? MinVolumes,
    int? MaxVolumes,
    bool InStockOnly,
    bool InstallmentsOnly,
    BookBadges? Badge,
    CatalogSort? Sort,
    int Page = 1,
    int PageSize = 24,
    bool IncludeFacets = false) : IQuery<CatalogSearchResultDto>;

public sealed class SearchCatalogQueryValidator : AbstractValidator<SearchCatalogQuery>
{
    public SearchCatalogQueryValidator()
    {
        RuleFor(x => x.Q).MaximumLength(200);
        RuleFor(x => x.Category).MaximumLength(200);
        RuleFor(x => x.Muhaqqiqs!.Count).LessThanOrEqualTo(10).When(x => x.Muhaqqiqs is not null);
        RuleForEach(x => x.Levels).IsInEnum();
        RuleFor(x => x.MinPrice).GreaterThanOrEqualTo(0).When(x => x.MinPrice.HasValue);
        RuleFor(x => x).Must(x => x.MinPrice is null || x.MaxPrice is null || x.MinPrice <= x.MaxPrice)
            .WithMessage("minPrice must not be above maxPrice.");
        RuleFor(x => x.MinVolumes).GreaterThanOrEqualTo(1).When(x => x.MinVolumes.HasValue);
        RuleFor(x => x).Must(x => x.MinVolumes is null || x.MaxVolumes is null || x.MinVolumes <= x.MaxVolumes)
            .WithMessage("minVolumes must not be above maxVolumes.");
        RuleFor(x => x.Badge)
            .Must(b => b is null || (b != BookBadges.None && Enum.IsDefined(b.Value)))
            .WithMessage("Unknown badge. Use New, Deluxe or Bestseller.");
        RuleFor(x => x.Sort).IsInEnum().When(x => x.Sort.HasValue);
        RuleFor(x => x.Page).InclusiveBetween(1, 1000);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 60);
    }
}

public sealed class SearchCatalogQueryHandler(
    ICatalogSearch catalogSearch,
    ICategoryRepository categoryRepository,
    IMuhaqqiqRepository muhaqqiqRepository,
    IReviewQueries reviewQueries,
    IFileStorage fileStorage)
    : IQueryHandler<SearchCatalogQuery, CatalogSearchResultDto>
{
    private const int MaxMuhaqqiqFacets = 30;

    public async Task<Result<CatalogSearchResultDto>> Handle(SearchCatalogQuery query, CancellationToken ct)
    {
        // Both tables are small and needed for names anyway: load once,
        // reuse for slug lookups, name matching, facets and the DTOs.
        var categories = await categoryRepository.ListAsync(includeInactive: true, ct);
        var muhaqqiqs = await muhaqqiqRepository.ListAsync(includeInactive: true, ct);

        var taxonomy = new TaxonomyLookup(categories.ToDictionary(c => c.Id), muhaqqiqs.ToDictionary(m => m.Id));
        var activeCategories = categories.Where(c => c.IsActive).ToList();
        var activeMuhaqqiqs = muhaqqiqs.Where(m => m.IsActive).ToList();

        IReadOnlyCollection<int>? categoryIds = null;
        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            var category = FindBySlug(activeCategories, c => c.Slug, query.Category);
            if (category is null)
                return Result.Failure<CatalogSearchResultDto>(CatalogErrors.CategorySlugNotFound(query.Category));

            // A top-level category includes its subcategories.
            categoryIds = activeCategories
                .Where(c => c.Id == category.Id || c.ParentId == category.Id)
                .Select(c => c.Id)
                .ToList();
        }

        IReadOnlyCollection<int>? muhaqqiqIds = null;
        if (query.Muhaqqiqs is { Count: > 0 })
        {
            var ids = new List<int>();
            foreach (var slug in query.Muhaqqiqs)
            {
                var muhaqqiq = FindBySlug(activeMuhaqqiqs, m => m.Slug, slug);
                if (muhaqqiq is null)
                    return Result.Failure<CatalogSearchResultDto>(CatalogErrors.MuhaqqiqSlugNotFound(slug));

                ids.Add(muhaqqiq.Id);
            }

            muhaqqiqIds = ids;
        }

        var search = SearchTermBuilder.Build(query.Q, activeCategories, activeMuhaqqiqs);

        // Relevance only means something when there's a search word.
        var sort = query.Sort ?? (search.Terms.Count > 0 ? CatalogSort.Relevance : CatalogSort.Bestselling);
        if (sort == CatalogSort.Relevance && search.Terms.Count == 0)
            sort = CatalogSort.Bestselling;

        var filter = new CatalogSearchFilter(
            search.Phrase, search.Terms, categoryIds, muhaqqiqIds,
            query.Levels is { Count: > 0 } levels ? levels : null,
            query.MinPrice, query.MaxPrice, query.MinVolumes, query.MaxVolumes,
            query.InStockOnly, query.InstallmentsOnly, query.Badge,
            sort, query.Page, query.PageSize);

        var (books, totalCount) = await catalogSearch.SearchAsync(filter, ct);

        var ratings = await reviewQueries.GetRatingSnapshotsAsync(books.Select(b => b.Id).ToList(), ct);
        var items = books
            .Select(b => b.ToPublicDto(fileStorage, ratings.GetValueOrDefault(b.Id), taxonomy))
            .ToList();

        CatalogFacetsDto? facets = null;
        if (query.IncludeFacets)
        {
            var counts = await catalogSearch.GetFacetsAsync(filter, ct);
            facets = BuildFacets(counts, activeCategories, activeMuhaqqiqs);
        }

        return Result.Success(new CatalogSearchResultDto(
            new PagedResult<PublicBookDto>(items, query.Page, query.PageSize, totalCount),
            facets,
            search.Terms.Select(t => t.Text).ToList(),
            sort));
    }

    private static T? FindBySlug<T>(IEnumerable<T> items, Func<T, Slug> slugOf, string input) where T : class
    {
        Slug slug;
        try
        {
            slug = Slug.Create(input);
        }
        catch (ArgumentException)
        {
            return null;
        }

        return items.FirstOrDefault(item => slugOf(item) == slug);
    }

    private static CatalogFacetsDto BuildFacets(
        CatalogFacetCounts counts, IReadOnlyList<Category> activeCategories, IReadOnlyList<Muhaqqiq> activeMuhaqqiqs)
    {
        var categoryFacets = activeCategories
            .Where(c => c.IsTopLevel)
            .OrderBy(c => c.DisplayOrder).ThenBy(c => c.Name, StringComparer.Ordinal)
            .Select(top =>
            {
                var children = activeCategories
                    .Where(c => c.ParentId == top.Id)
                    .OrderBy(c => c.DisplayOrder).ThenBy(c => c.Name, StringComparer.Ordinal)
                    .Select(c => new FacetCountDto(c.Id, c.Slug.Value, c.Name, counts.Categories.GetValueOrDefault(c.Id)))
                    .Where(f => f.Count > 0)
                    .ToList();

                var total = counts.Categories.GetValueOrDefault(top.Id) + children.Sum(c => c.Count);
                return new CategoryFacetDto(top.Id, top.Slug.Value, top.Name, total, children);
            })
            .Where(f => f.Count > 0)
            .ToList();

        var muhaqqiqFacets = activeMuhaqqiqs
            .Select(m => new FacetCountDto(m.Id, m.Slug.Value, m.Name, counts.Muhaqqiqs.GetValueOrDefault(m.Id)))
            .Where(f => f.Count > 0)
            .OrderByDescending(f => f.Count)
            .ThenBy(f => f.Name, StringComparer.Ordinal)
            .Take(MaxMuhaqqiqFacets)
            .ToList();

        // Every level, zeros included: the filter UI keeps a stable layout.
        var levelFacets = Enum.GetValues<ReaderLevel>()
            .Select(level => new LevelFacetDto(level, counts.Levels.GetValueOrDefault(level)))
            .ToList();

        return new CatalogFacetsDto(
            categoryFacets, muhaqqiqFacets, levelFacets, counts.MinPrice, counts.MaxPrice, counts.InStock);
    }
}