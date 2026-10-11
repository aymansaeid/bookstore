using BookStore.Application.Orders.Checkout;
using BookStore.Domain.Books;
using BookStore.Domain.Common;
using BookStore.Domain.ReadingPaths;
using FluentAssertions;

namespace BookStore.Application.Tests.Checkout;

public class PathDiscountRulesTests
{
    private static Book CreateBook(int id, decimal price)
    {
        var book = Book.Create($"كتاب {id}", null, "مؤلف", Slug.Create($"b-{id}"), "", "",
            BookFormat.Hardcover, 300, "ar", null, null,
            BookDimensions.Create(500, 240, 170, 30), Money.From(price, "TRY"), 10);
        typeof(Book).BaseType!.BaseType!.GetProperty("Id")!.SetValue(book, id);
        return book;
    }

    private static readonly Book A = CreateBook(1, 1000m);
    private static readonly Book B = CreateBook(2, 2000m);
    private static readonly Book C = CreateBook(3, 500m);

    private static ReadingPath Path() =>
        ReadingPath.Create("مسار", Slug.Create("path"), null, ReaderLevel.Beginner, 12, 10, false, 0,
            [new(1, "a", null), new(2, "b", null), new(3, "c", null)]);

    [Fact]
    public void FullCart_GetsTenPercentOfAllBooks()
    {
        var result = PathDiscountRules.Evaluate(Path(), [A, B, C], new HashSet<int>(), new HashSet<int> { 1, 2, 3 }, "TRY");

        result.Applies.Should().BeTrue();
        result.Amount.Amount.Should().Be(350m);
    }

    [Fact]
    public void OwnedBooks_AreNotRequired_AndNotDiscounted()
    {
        // Owns A: needs only B and C; discount on 2500, matching remainingPricing.
        var result = PathDiscountRules.Evaluate(Path(), [A, B, C], new HashSet<int> { 1 }, new HashSet<int> { 2, 3 }, "TRY");

        result.Amount.Amount.Should().Be(250m);
    }

    [Fact]
    public void MissingBook_IsReported_WithNoDiscount()
    {
        var result = PathDiscountRules.Evaluate(Path(), [A, B, C], new HashSet<int>(), new HashSet<int> { 1, 2 }, "TRY");

        result.Applies.Should().BeFalse();
        result.Problem.Should().Be(PathDiscountRules.PathIncomplete);
        result.MissingBookIds.Should().Equal(3);
    }

    [Fact]
    public void EverythingOwned_IsReported()
    {
        var result = PathDiscountRules.Evaluate(Path(), [A, B, C], new HashSet<int> { 1, 2, 3 }, new HashSet<int>(), "TRY");

        result.Problem.Should().Be(PathDiscountRules.PathAlreadyOwned);
    }
}