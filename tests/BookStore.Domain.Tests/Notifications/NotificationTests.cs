using BookStore.Domain.Books;
using BookStore.Domain.Books.Events;
using BookStore.Domain.Catalog;
using BookStore.Domain.Common;
using BookStore.Domain.Notifications;
using FluentAssertions;

namespace BookStore.Domain.Tests.Notifications;

public class NotificationTests
{
    private static Book CreateBook(decimal price = 2400m) =>
        Book.Create("زاد المعاد", null, "ابن قيم الجوزية", Slug.Create("زاد المعاد"), "",
            "", BookFormat.Hardcover, 2400, "ar", null, null,
            BookDimensions.Create(5200, 240, 170, 210), Money.From(price, "TRY"), 10);

    [Fact]
    public void PriceDrop_RaisesEvent_OnlyWhenLower()
    {
        var book = CreateBook(2400m);
        book.ClearDomainEvents();

        book.UpdatePrice(Money.From(2400m, "TRY"));
        book.UpdatePrice(Money.From(2600m, "TRY"));
        book.DomainEvents.Should().BeEmpty();

        book.UpdatePrice(Money.From(2200m, "TRY"));
        book.DomainEvents.OfType<BookPriceDroppedDomainEvent>().Single().OldPrice.Should().Be(2600m);
    }

    [Fact]
    public void PriceDrop_OnHiddenBook_IsSilent()
    {
        var book = CreateBook(2400m);
        book.Deactivate();
        book.ClearDomainEvents();

        book.UpdatePrice(Money.From(2000m, "TRY"));

        book.DomainEvents.Should().BeEmpty();
    }

    [Fact]
    public void SetTaxonomy_RaisesOnlyForNewlyAddedMuhaqqiqs()
    {
        var book = CreateBook();
        book.SetTaxonomy(null, [3]);
        book.ClearDomainEvents();

        book.SetTaxonomy(null, [3, 5]);

        book.DomainEvents.OfType<MuhaqqiqWorkAddedDomainEvent>().Single().MuhaqqiqIds.Should().Equal(5);
    }

    [Fact]
    public void ResavingSameTaxonomy_IsSilent()
    {
        var book = CreateBook();
        book.SetTaxonomy(null, [3]);
        book.ClearDomainEvents();

        book.SetTaxonomy(null, [3]);

        book.DomainEvents.Should().BeEmpty();
    }

    [Fact]
    public void MuhaqqiqKey_IsStable_SoItNotifiesOnceEver()
    {
        var book = CreateBook();
        var muhaqqiq = Muhaqqiq.Create("شعيب الأرناؤوط", Slug.Create("arnaut"), null, [], true, 0);

        Notification.ForNewFromMuhaqqiq(1, book, muhaqqiq).DedupKey
            .Should().Be(Notification.ForNewFromMuhaqqiq(1, book, muhaqqiq).DedupKey);
    }

    [Fact]
    public void PriceDropKeys_DifferPerEvent()
    {
        var book = CreateBook();

        Notification.ForPriceDrop(1, book, 2400m, 2200m, "TRY", eventTicks: 1).DedupKey
            .Should().NotBe(Notification.ForPriceDrop(1, book, 2200m, 2000m, "TRY", eventTicks: 2).DedupKey);
    }

    [Fact]
    public void MarkRead_KeepsFirstReadTime()
    {
        var notification = Notification.ForOrderShipped(1, "BK-1");
        notification.MarkRead();
        var first = notification.ReadAtUtc;

        notification.MarkRead();

        notification.ReadAtUtc.Should().Be(first);
    }
}