using BookStore.Domain.Books;
using BookStore.Domain.Catalog;
using BookStore.Domain.Common;

namespace BookStore.Domain.Notifications;

public enum NotificationType
{
    OrderShipped = 0,
    BackInStock = 1,
    PriceDrop = 2,
    NewFromFollowedMuhaqqiq = 3
}

/// Facts, not sentences: the frontend words each type in the reader's
/// language. Book title and muhaqqiq name are snapshots, so an old
/// notification still reads correctly if the book is later renamed.
public sealed class Notification : AggregateRoot<int>
{
    public const int MaxDedupKeyLength = 200;

    public int CustomerId { get; private set; }
    public NotificationType Type { get; private set; }

    /// Unique per customer: an outbox retry can never notify anyone twice.
    public string DedupKey { get; private set; } = string.Empty;

    public int? BookId { get; private set; }
    public string? BookTitle { get; private set; }
    public string? BookSlug { get; private set; }
    public string? OrderNumber { get; private set; }
    public int? MuhaqqiqId { get; private set; }
    public string? MuhaqqiqName { get; private set; }
    public string? MuhaqqiqSlug { get; private set; }
    public decimal? OldPrice { get; private set; }
    public decimal? NewPrice { get; private set; }
    public string? Currency { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? ReadAtUtc { get; private set; }

    public bool IsRead => ReadAtUtc.HasValue;

    private Notification() { } // EF Core

    public static Notification ForOrderShipped(int customerId, string orderNumber) =>
        New(customerId, NotificationType.OrderShipped, $"order-shipped:{orderNumber}", n => n.OrderNumber = orderNumber);

    /// eventTicks: the domain event's timestamp. A retry of the same event
    /// gets the same key (skipped); a later, real event gets a new key.
    public static Notification ForBackInStock(int customerId, Book book, long eventTicks) =>
        New(customerId, NotificationType.BackInStock, $"back-in-stock:{book.Id}:{eventTicks}", n => n.WithBook(book));

    public static Notification ForPriceDrop(int customerId, Book book, decimal oldPrice, decimal newPrice, string currency, long eventTicks) =>
        New(customerId, NotificationType.PriceDrop, $"price-drop:{book.Id}:{eventTicks}", n =>
        {
            n.WithBook(book);
            n.OldPrice = oldPrice;
            n.NewPrice = newPrice;
            n.Currency = currency;
        });

    /// No event time in the key on purpose: once per book per muhaqqiq, ever.
    public static Notification ForNewFromMuhaqqiq(int customerId, Book book, Muhaqqiq muhaqqiq) =>
        New(customerId, NotificationType.NewFromFollowedMuhaqqiq, $"muhaqqiq-work:{book.Id}:{muhaqqiq.Id}", n =>
        {
            n.WithBook(book);
            n.MuhaqqiqId = muhaqqiq.Id;
            n.MuhaqqiqName = muhaqqiq.Name;
            n.MuhaqqiqSlug = muhaqqiq.Slug.Value;
        });

    public void MarkRead() => ReadAtUtc ??= DateTimeOffset.UtcNow;

    private void WithBook(Book book)
    {
        BookId = book.Id;
        BookTitle = book.Title;
        BookSlug = book.Slug.Value;
    }

    private static Notification New(int customerId, NotificationType type, string dedupKey, Action<Notification> fill)
    {
        var notification = new Notification
        {
            CustomerId = customerId,
            Type = type,
            DedupKey = dedupKey,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        fill(notification);
        return notification;
    }
}