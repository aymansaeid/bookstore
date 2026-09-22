using BookStore.Domain.Books;
using BookStore.Domain.Common;
using FluentAssertions;

namespace BookStore.Domain.Tests.Books;

public class BookStockTests
{
    private static Book CreateBook(int stock = 10) =>
        Book.Create("Test Book", null, "Test Author", Slug.Create("test-book"), "9780000000001",
            "Description", BookFormat.Paperback, 200, "en", null, null,
            BookDimensions.Create(400, 210, 148, 20),
            Money.From(25m, "USD"), stock);

    [Fact]
    public void Reserve_ReducesAvailableButNotPhysicalStock()
    {
        var book = CreateBook(10);

        book.Reserve(3);

        book.StockQuantity.Should().Be(10);
        book.ReservedQuantity.Should().Be(3);
        book.AvailableToSell.Should().Be(7);
    }

    [Fact]
    public void Reserve_Throws_WhenNotEnoughAvailable()
    {
        var book = CreateBook(2);

        var act = () => book.Reserve(3);

        act.Should().Throw<InsufficientStockException>();
    }

    [Fact]
    public void Reserve_CannotOversellUsingAlreadyReservedUnits()
    {
        var book = CreateBook(5);
        book.Reserve(4);

        // Only 1 available even though StockQuantity still reads 5.
        var act = () => book.Reserve(2);

        act.Should().Throw<InsufficientStockException>();
    }

    [Fact]
    public void ConfirmSale_DeductsBothReservedAndPhysicalStock()
    {
        var book = CreateBook(10);
        book.Reserve(3);

        book.ConfirmSale(3);

        book.StockQuantity.Should().Be(7);
        book.ReservedQuantity.Should().Be(0);
    }

    [Fact]
    public void ConfirmSale_Throws_WhenNothingReserved()
    {
        var book = CreateBook(10);

        var act = () => book.ConfirmSale(1);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void SetStockQuantity_Throws_WhenBelowReserved()
    {
        var book = CreateBook(10);
        book.Reserve(4);

        var act = () => book.SetStockQuantity(3);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*4 unit(s) are reserved*");
    }
}