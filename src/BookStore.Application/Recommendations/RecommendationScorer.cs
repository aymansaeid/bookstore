using BookStore.Domain.Books;

namespace BookStore.Application.Recommendations;

public enum RecommendationReasonType
{
    BecauseYouBought = 0,
    FollowsMuhaqqiq = 1,
    MatchesInterest = 2,
    Popular = 3
}

public sealed record RecommendationReason(RecommendationReasonType Type, int? RefId, string? RefSlug, string? Label);

public sealed record ScoredBook(Book Book, int? MatchPercent, IReadOnlyList<RecommendationReason> Reasons);

public sealed record RecommendationSignals(
    IReadOnlySet<int> ExcludedBookIds,
    IReadOnlyDictionary<int, (int OwnedBookId, string OwnedTitle)> ComplementsOfOwned,
    IReadOnlyDictionary<int, (string Name, string Slug)> FollowedMuhaqqiqs,
    IReadOnlyDictionary<int, (string Name, string Slug)> InterestCategories,
    IReadOnlyDictionary<int, int> ParentOfCategory,
    ReaderLevel? Level,
    decimal? MonthlyBudget,
    IReadOnlyList<int> BestsellerIds);

public static class RecommendationScorer
{
    public static IReadOnlyList<ScoredBook> Rank(IEnumerable<Book> candidates, RecommendationSignals s, int limit)
    {
        var popularityRank = s.BestsellerIds.Select((id, rank) => (id, rank)).ToDictionary(x => x.id, x => x.rank);
        var eligible = candidates
            .DistinctBy(b => b.Id)
            .Where(b => b.IsActive && b.AvailableToSell > 0 && !s.ExcludedBookIds.Contains(b.Id))
            .ToList();

        var scored = new List<(Book Book, int Score, List<RecommendationReason> Reasons)>();

        foreach (var book in eligible)
        {
            var score = 0;
            var reasons = new List<RecommendationReason>();

            if (s.ComplementsOfOwned.TryGetValue(book.Id, out var owned))
            {
                score += 40;
                reasons.Add(new(RecommendationReasonType.BecauseYouBought, owned.OwnedBookId, null, owned.OwnedTitle));
            }

            var followed = book.OrderedMuhaqqiqIds.FirstOrDefault(s.FollowedMuhaqqiqs.ContainsKey);
            if (followed != 0)
            {
                score += 35;
                var m = s.FollowedMuhaqqiqs[followed];
                reasons.Add(new(RecommendationReasonType.FollowsMuhaqqiq, followed, m.Slug, m.Name));
            }

            if (book.CategoryId is { } categoryId)
            {
                // A subcategory book matches an interest in its parent too.
                var interestId = s.InterestCategories.ContainsKey(categoryId) ? categoryId
                    : s.ParentOfCategory.TryGetValue(categoryId, out var parent) && s.InterestCategories.ContainsKey(parent) ? parent
                    : (int?)null;

                if (interestId is { } i)
                {
                    score += 25;
                    var c = s.InterestCategories[i];
                    reasons.Add(new(RecommendationReasonType.MatchesInterest, i, c.Slug, c.Name));
                }
            }

            // Only books with a real, explainable reason are "for you".
            if (reasons.Count == 0)
                continue;

            if (s.Level is { } level && book.Level == level) score += 10;
            if (s.MonthlyBudget is { } budget) score += book.Price.Amount <= budget ? 5 : -15;
            if (popularityRank.TryGetValue(book.Id, out var rank)) score += Math.Max(0, 10 - rank);

            scored.Add((book, score, reasons));
        }

        var picks = scored
            .OrderByDescending(x => x.Score)
            .ThenBy(x => popularityRank.GetValueOrDefault(x.Book.Id, int.MaxValue))
            .Take(limit)
            .Select(x => new ScoredBook(x.Book, ToMatchPercent(x.Score), x.Reasons.Take(2).ToList()))
            .ToList();

        // Not enough personal signal (e.g. a brand-new account): fill with
        // bestsellers, honestly labelled, with NO match percentage.
        if (picks.Count < limit)
        {
            var chosen = picks.Select(p => p.Book.Id).ToHashSet();
            var eligibleById = eligible.ToDictionary(b => b.Id);

            picks.AddRange(s.BestsellerIds
                .Where(id => !chosen.Contains(id) && eligibleById.ContainsKey(id))
                .Take(limit - picks.Count)
                .Select(id => new ScoredBook(eligibleById[id], null,
                    [new RecommendationReason(RecommendationReasonType.Popular, null, null, null)])));
        }

        return picks;
    }

    /// A ranking signal mapped onto 50-98%, not a scientific probability.
    /// Capped below 100 on purpose: nothing is a certain match.
    internal static int ToMatchPercent(int score) => Math.Clamp(50 + (int)Math.Round(score * 0.4), 50, 98);
}