using BookStore.Domain.Books;
using BookStore.Domain.Common;
using FluentAssertions;

namespace BookStore.Domain.Tests.Books;

public class BookImageTests
{
    private static Book CreateBook() =>
        Book.Create("Test Book", null, "Test Author", Slug.Create("test-book"), "9780000000001",
            "Description", BookFormat.Paperback, 200, "en", null, null,
            BookDimensions.Create(400, 210, 148, 20),
            Money.From(25m, "USD"), 10);

    [Fact]
    public void AddImage_MakesFirstImageTheCover()
    {
        var book = CreateBook();

        book.AddImage("books/a.jpg", "Front cover");
        book.AddImage("books/b.jpg", "Back cover");

        book.Images.Count(i => i.IsCover).Should().Be(1);
        book.CoverImage!.StorageKey.Should().Be("books/a.jpg");
    }

    [Fact]
    public void AddImage_Throws_WhenLimitReached()
    {
        var book = CreateBook();
        for (var i = 0; i < Book.MaxImages; i++)
            book.AddImage($"books/{i}.jpg", $"Image {i}");

        var act = () => book.AddImage("books/overflow.jpg", "One too many");

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void RemoveImage_PromotesNextImage_WhenCoverRemoved()
    {
        var book = CreateBook();
        book.AddImage("books/a.jpg", "First");
        book.AddImage("books/b.jpg", "Second");

        var coverId = book.CoverImage!.Id;
        var removedKey = book.RemoveImage(coverId);

        removedKey.Should().Be("books/a.jpg");
        book.Images.Should().HaveCount(1);
        book.CoverImage!.StorageKey.Should().Be("books/b.jpg");
    }

    [Fact]
    public void ReorderImages_Throws_OnPartialList()
    {
        var book = CreateBook();
        book.AddImage("books/a.jpg", "First");
        book.AddImage("books/b.jpg", "Second");

        var act = () => book.ReorderImages([book.Images.First().Id]);

        act.Should().Throw<InvalidOperationException>();
    }
}