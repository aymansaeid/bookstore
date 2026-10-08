using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Reviews.Queries;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Books;
using BookStore.Application.Common;
using BookStore.Application.Library;
using BookStore.Domain.Books;

namespace BookStore.Application.Recommendations;

public sealed record RecommendedBookDto(BookSummaryDto Book, int? MatchPercent, IReadOnlyList<RecommendationReason> Reasons);

/// HeadlineReasons: the pills above the row («لأنك اشتريت…», «لأنك تتابع…»).
public sealed record RecommendationsDto(IReadOnlyList<RecommendedBookDto> Items, IReadOnlyList<RecommendationReason> HeadlineReasons);

public sealed record GetRecommendationsQuery(int CustomerId, int Limit = 6) : IQuery<RecommendationsDto>;

public sealed class GetRecommendationsQueryHandler(
    LibraryReader libraryReader,
    ICustomerRepository customerRepository,
    IBookRepository bookRepository,
    IMuhaqqiqFollowRepository followRepository,
    IMuhaqqiqRepository muhaqqiqRepository,
    ICategoryRepository categoryRepository,
    ICatalogSearch catalogSearch,
    IReviewQueries reviewQueries,
    IFileStorage fileStorage)
    : IQueryHandler<GetRecommendationsQuery, RecommendationsDto>
{
    private const int PoolSize = 40;

    public async Task<Result<RecommendationsDto>> Handle(GetRecommendationsQuery query, CancellationToken ct)
    {
        var limit = Math.Clamp(query.Limit, 1, 24);
        var customer = await customerRepository.GetByIdAsync(query.CustomerId, ct);

        // 1. What they own: never suggested, and the source of "because you bought".
        var (owned, _) = await libraryReader.LoadAsync(query.CustomerId, ct);
        var ownedBooks = owned.Count == 0 ? [] : await bookRepository.ListByIdsAsync(owned.Keys.ToList(), ct);

        var complements = new Dictionary<int, (int, string)>();
        foreach (var ownedBook in ownedBooks)
            foreach (var relatedId in ownedBook.OrderedRelatedBookIds)
                complements.TryAdd(relatedId, (ownedBook.Id, ownedBook.Title));

        // 2. Who they follow, and what they're interested in.
        var followIds = (await followRepository.ListByCustomerAsync(query.CustomerId, ct)).Select(f => f.MuhaqqiqId).ToList();
        var followed = followIds.Count == 0 ? [] : await muhaqqiqRepository.ListByIdsAsync(followIds, ct);

        var categories = await categoryRepository.ListAsync(includeInactive: false, ct);
        var interestIds = customer?.InterestCategoryIds.ToHashSet() ?? [];
        var interests = categories.Where(c => interestIds.Contains(c.Id)).ToList();

        // 3. Candidate pools: each is one bounded, indexed query.
        var bestsellers = (await catalogSearch.SearchAsync(Browse(null, null), ct)).Items;
        var candidates = new List<Book>(bestsellers);

        if (followed.Count > 0)
            candidates.AddRange((await catalogSearch.SearchAsync(Browse(null, followed.Select(m => m.Id).ToList()), ct)).Items);

        if (interests.Count > 0)
        {
            var withChildren = categories
                .Where(c => interestIds.Contains(c.Id) || (c.ParentId is { } p && interestIds.Contains(p)))
                .Select(c => c.Id).ToList();
            candidates.AddRange((await catalogSearch.SearchAsync(Browse(withChildren, null), ct)).Items);
        }

        if (complements.Count > 0)
            candidates.AddRange(await bookRepository.ListByIdsAsync(complements.Keys.ToList(), ct));

        // 4. Score.
        var signals = new RecommendationSignals(
            owned.Keys.ToHashSet(),
            complements.ToDictionary(kv => kv.Key, kv => kv.Value),
            followed.Where(m => m.IsActive).ToDictionary(m => m.Id, m => (m.Name, m.Slug.Value)),
            interests.ToDictionary(c => c.Id, c => (c.Name, c.Slug.Value)),
            categories.Where(c => c.ParentId is not null).ToDictionary(c => c.Id, c => c.ParentId!.Value),
            customer?.ReadingLevel,
            customer?.MonthlyBudget,
            bestsellers.Select(b => b.Id).ToList());

        var picks = RecommendationScorer.Rank(candidates, signals, limit);
        var ratings = await reviewQueries.GetRatingSnapshotsAsync(picks.Select(p => p.Book.Id).ToList(), ct);

        var items = picks.Select(p => new RecommendedBookDto(
            p.Book.ToSummaryDto(fileStorage, ratings.GetValueOrDefault(p.Book.Id)), p.MatchPercent, p.Reasons)).ToList();

        // The two most frequent personal reasons become the row's pills.
        var headline = items
            .SelectMany(i => i.Reasons)
            .Where(r => r.Type != RecommendationReasonType.Popular)
            .GroupBy(r => (r.Type, r.RefId))
            .OrderByDescending(g => g.Count())
            .Select(g => g.First())
            .Take(2)
            .ToList();

        return Result.Success(new RecommendationsDto(items, headline));
    }

    private static CatalogSearchFilter Browse(IReadOnlyCollection<int>? categoryIds, IReadOnlyCollection<int>? muhaqqiqIds) =>
        new(null, [], categoryIds, muhaqqiqIds, null, null, null, null, null,
            InStockOnly: true, InstallmentsOnly: false, Badge: null, CatalogSort.Bestselling, Page: 1, PageSize: PoolSize);
}