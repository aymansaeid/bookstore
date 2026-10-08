using BookStore.Application.Recommendations;
using BookStore.Domain.Books;
using BookStore.Domain.Common;
using FluentAssertions;

namespace BookStore.Application.Tests.Recommendations;

public class RecommendationScorerTests
{
    // Unsaved books all have Id 0, so these tests set ids via a tiny helper.
    private static Book CreateBook(int id, decimal price = 500m, int? categoryId = null, int[]? muhaqqiqs = null)
    {
        var book = Book.Create($"كتاب {id}", null, "مؤلف", Slug.Create($"book-{id}"), "", "",
            BookFormat.Hardcover, 300, "ar", null, null,
            BookDimensions.Create(500, 240, 170, 30), Money.From(price, "TRY"), 10);

        typeof(Book).BaseType!.BaseType!.GetProperty("Id")!.SetValue(book, id);
        if (categoryId is not null || muhaqqiqs is not null)
            book.SetTaxonomy(categoryId, muhaqqiqs ?? []);

        return book;
    }

    private static RecommendationSignals Signals(
        IReadOnlySet<int>? excluded = null,
        IReadOnlyDictionary<int, (int, string)>? complements = null,
        IReadOnlyDictionary<int, (string, string)>? followed = null,
        IReadOnlyDictionary<int, (string, string)>? interests = null,
        IReadOnlyList<int>? bestsellers = null) =>
        new(excluded ?? new HashSet<int>(),
            complements ?? new Dictionary<int, (int, string)>(),
            followed ?? new Dictionary<int, (string, string)>(),
            interests ?? new Dictionary<int, (string, string)>(),
            new Dictionary<int, int>(),
            null, null,
            bestsellers ?? []);

    [Fact]
    public void OwnedBooks_AreNeverSuggested()
    {
        var picks = RecommendationScorer.Rank(
            [CreateBook(1, categoryId: 5)],
            Signals(excluded: new HashSet<int> { 1 }, interests: new Dictionary<int, (string, string)> { [5] = ("الحديث", "hadith") }),
            limit: 6);

        picks.Should().BeEmpty();
    }

    [Fact]
    public void Complement_OutranksInterest_AndCarriesItsReason()
    {
        var picks = RecommendationScorer.Rank(
            [CreateBook(1, categoryId: 5), CreateBook(2)],
            Signals(
                complements: new Dictionary<int, (int, string)> { [2] = (99, "رياض الصالحين") },
                interests: new Dictionary<int, (string, string)> { [5] = ("الحديث", "hadith") }),
            limit: 6);

        picks[0].Book.Id.Should().Be(2);
        picks[0].Reasons[0].Type.Should().Be(RecommendationReasonType.BecauseYouBought);
        picks[0].Reasons[0].Label.Should().Be("رياض الصالحين");
    }

    [Fact]
    public void NoSignals_FallsBackToBestsellers_WithoutMatchPercent()
    {
        var picks = RecommendationScorer.Rank(
            [CreateBook(1), CreateBook(2)], Signals(bestsellers: [2, 1]), limit: 2);

        picks.Select(p => p.Book.Id).Should().Equal(2, 1);
        picks.Should().OnlyContain(p => p.MatchPercent == null && p.Reasons[0].Type == RecommendationReasonType.Popular);
    }

    [Fact]
    public void MatchPercent_IsCappedBelow100()
    {
        RecommendationScorer.ToMatchPercent(10_000).Should().Be(98);
        RecommendationScorer.ToMatchPercent(0).Should().Be(50);
    }
}