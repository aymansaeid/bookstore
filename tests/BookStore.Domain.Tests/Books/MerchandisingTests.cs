using BookStore.Domain.Books;
using BookStore.Domain.Common;
using FluentAssertions;

namespace BookStore.Domain.Tests.Books;

public class MerchandisingTests
{
    private static Book CreateBook(decimal price = 2400m) =>
        Book.Create("زاد المعاد", null, "ابن قيم الجوزية", Slug.Create("زاد المعاد"), "",
            "", BookFormat.Hardcover, 2400, "ar", null, null,
            BookDimensions.Create(5200, 240, 170, 210), Money.From(price, "TRY"), 10);

    private static void SetOldPrice(Book book, decimal? oldPrice) =>
        book.SetMerchandising(null, null, oldPrice, false, [], BookBadges.None, null);

    [Fact]
    public void Savings_MatchTheSpecExample()
    {
        // Spec 5.4: 2,400 TRY, was 2,700 TRY -> save 300 TRY, 11%.
        var book = CreateBook(2400m);
        SetOldPrice(book, 2700m);

        book.SavingsAmount.Should().Be(300m);
        book.SavingsPercent.Should().Be(11);
    }

    [Fact]
    public void OldPrice_MustBeHigherThanPrice()
    {
        var act = () => SetOldPrice(CreateBook(2400m), 2400m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void RaisingPriceAboveOldPrice_ClearsTheDiscount()
    {
        var book = CreateBook(2400m);
        SetOldPrice(book, 2700m);

        book.UpdatePrice(Money.From(2800m, "TRY"));

        book.CompareAtPrice.Should().BeNull();
        book.SavingsAmount.Should().BeNull();
    }

    [Fact]
    public void LoweringPrice_KeepsTheDiscount()
    {
        var book = CreateBook(2400m);
        SetOldPrice(book, 2700m);

        book.UpdatePrice(Money.From(2200m, "TRY"));

        book.SavingsAmount.Should().Be(500m);
    }

    [Fact]
    public void Highlights_AreCleanedAndCapped()
    {
        var book = CreateBook();

        book.SetMerchandising(ReaderLevel.Intermediate, 6, null, true,
            ["هدي النبي في العبادات", " هدي النبي في العبادات ", "", "الطب النبوي"],
            BookBadges.Bestseller | BookBadges.Deluxe, "الكاملة ٦ مجلدات");

        book.Highlights.Should().Equal("هدي النبي في العبادات", "الطب النبوي");
        book.Badges.HasFlag(BookBadges.Deluxe).Should().BeTrue();
        book.Badges.HasFlag(BookBadges.New).Should().BeFalse();
    }

    [Fact]
    public void RelatedBooks_KeepOrder_AndRejectSelf()
    {
        var book = CreateBook();

        book.SetRelatedBooks([5, 3]);
        book.OrderedRelatedBookIds.Should().Equal(5, 3);

        book.SetRelatedBooks([3, 5, 8]);
        book.OrderedRelatedBookIds.Should().Equal(3, 5, 8);

        // Id is 0 for an unsaved book; relating to 0 is relating to itself.
        var act = () => book.SetRelatedBooks([0]);
        act.Should().Throw<ArgumentException>();
    }
}