using BookStore.Domain.Books;
using BookStore.Domain.Books.Events;
using BookStore.Domain.Common;
using FluentAssertions;

namespace BookStore.Domain.Tests.Books;

public class BackInStockEventTests
{
    private static Book CreateBook(int stock) =>
        Book.Create("Test Book", null, "Test Author", Slug.Create("test-book"), "9780000000001",
            "Description", BookFormat.Paperback, 200, "en", null, null,
            BookDimensions.Create(400, 210, 148, 20),
            Money.From(25m, "USD"), stock);

    [Fact]
    public void Restock_RaisesEvent_WhenCrossingZero()
    {
        var book = CreateBook(0);

        book.Restock(5);

        book.DomainEvents.Should().ContainSingle(e => e is BookBackInStockDomainEvent);
    }

    [Fact]
    public void Restock_DoesNotRaiseEvent_WhenAlreadyInStock()
    {
        var book = CreateBook(3);

        book.Restock(5);

        book.DomainEvents.Should().BeEmpty();
    }

    [Fact]
    public void SetStockQuantity_RaisesEvent_WhenGoingFromZeroToPositive()
    {
        var book = CreateBook(0);

        book.SetStockQuantity(10);

        book.DomainEvents.Should().ContainSingle(e => e is BookBackInStockDomainEvent);
    }

    [Fact]
    public void SetStockQuantity_DoesNotRaiseEvent_WhenReducingStock()
    {
        var book = CreateBook(10);

        book.SetStockQuantity(2);

        book.DomainEvents.Should().BeEmpty();
    }

    [Fact]
    public void FullyReservedStock_CountsAsOutOfStock()
    {
        var book = CreateBook(3);
        book.Reserve(3); // AvailableToSell is now 0 even though StockQuantity is 3.
        book.ClearDomainEvents();

        book.Restock(2);

        book.DomainEvents.Should().ContainSingle(e => e is BookBackInStockDomainEvent);
    }
}