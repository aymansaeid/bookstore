using BookStore.Domain.Books;
using BookStore.Domain.ReadingPaths;
using FluentAssertions;

namespace BookStore.Domain.Tests.ReadingPaths;

public class ReadingPathTests
{
    private static ReadingPathStageInput Stage(int bookId) => new(bookId, "لأنه الأساس", 4);

    private static ReadingPath Create(IReadOnlyList<ReadingPathStageInput> stages, int discount = 10) =>
        ReadingPath.Create("من الأربعين إلى فتح الباري", Slug.Create("hadith-path"), null,
            ReaderLevel.Beginner, 28, discount, isFeatured: true, displayOrder: 0, stages);

    [Fact]
    public void Stages_AreNumberedInOrder()
    {
        var path = Create([Stage(7), Stage(3), Stage(9)]);

        path.OrderedStages.Select(s => s.BookId).Should().Equal(7, 3, 9);
        path.OrderedStages.Select(s => s.StageNumber).Should().Equal(1, 2, 3);
    }

    [Fact]
    public void SingleStage_IsRejected()
    {
        var act = () => Create([Stage(1)]);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void DuplicateBook_IsRejected()
    {
        var act = () => Create([Stage(1), Stage(1)]);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ExcessiveDiscount_IsRejected()
    {
        var act = () => Create([Stage(1), Stage(2)], discount: ReadingPath.MaxDiscountPercentage + 1);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}