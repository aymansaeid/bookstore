using BookStore.Domain.Books;
using BookStore.Domain.Common;
using FluentAssertions;

namespace BookStore.Domain.Tests.Books;

public class BookSearchIndexTests
{
    private static Book CreateBook() =>
        Book.Create("زَادُ المَعَاد", "في هدي خير العباد", "ابن قيم الجوزية", Slug.Create("زاد المعاد"), "9789953",
            "", BookFormat.Hardcover, 2400, "ar", "مؤسسة الرسالة", null,
            BookDimensions.Create(5200, 240, 170, 210), Money.From(2400m, "TRY"), 10);

    [Fact]
    public void NewBook_IsIndexed()
    {
        var book = CreateBook();

        book.SearchTitle.Should().Be("زاد المعاد في هدي خير العباد");
        book.SearchText.Should().Contain("ابن قيم الجوزيه").And.Contain("موسسه الرساله");
    }

    [Fact]
    public void Highlights_BecomeSearchable()
    {
        var book = CreateBook();

        book.SetMerchandising(null, 6, null, false, ["الطب النبوي"], BookBadges.None, null);

        book.SearchText.Should().Contain("الطب النبوي");
    }
}