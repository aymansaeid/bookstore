using BookStore.Application.Abstractions.Outbox;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Notifications;
using BookStore.Domain.Books.Events;
using BookStore.Domain.Notifications;
using BookStore.Domain.Orders.Events;

namespace BookStore.Application.Outbox.Handlers;

public sealed class OrderShippedNotificationHandler(
    IOrderRepository orderRepository, NotificationWriter writer) : IOutboxMessageHandler
{
    public string MessageType => nameof(OrderShippedDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<OrderShippedDomainEvent>(payloadJson);

        // Guests have no account and no bell; they get the email only.
        var order = await orderRepository.GetByIdAsync(e.OrderId, ct);
        if (order?.CustomerId is not { } customerId)
            return;

        await writer.AddNewAsync([Notification.ForOrderShipped(customerId, order.OrderNumber)], ct);
    }
}

/// In-app counterpart of the back-in-stock EMAIL (which goes to email
/// subscribers): this one reaches signed-in customers via their wishlist.
public sealed class BackInStockNotificationHandler(
    IBookRepository bookRepository, IWishlistRepository wishlistRepository, NotificationWriter writer)
    : IOutboxMessageHandler
{
    public string MessageType => nameof(BookBackInStockDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<BookBackInStockDomainEvent>(payloadJson);

        var book = await bookRepository.GetByIdAsync(e.BookId, ct);
        if (book is null || !book.IsActive)
            return;

        var customerIds = await wishlistRepository.ListCustomerIdsByBookAsync(book.Id, ct);

        await writer.AddNewAsync(
            customerIds.Select(id => Notification.ForBackInStock(id, book, e.OccurredOnUtc.UtcTicks)).ToList(), ct);
    }
}

public sealed class PriceDropNotificationHandler(
    IBookRepository bookRepository, IWishlistRepository wishlistRepository, NotificationWriter writer)
    : IOutboxMessageHandler
{
    public string MessageType => nameof(BookPriceDroppedDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<BookPriceDroppedDomainEvent>(payloadJson);

        var book = await bookRepository.GetByIdAsync(e.BookId, ct);

        // The price may have gone back up before this ran: don't announce a
        // drop that no longer exists.
        if (book is null || !book.IsActive || book.Price.Amount >= e.OldPrice)
            return;

        var customerIds = await wishlistRepository.ListCustomerIdsByBookAsync(book.Id, ct);

        await writer.AddNewAsync(
            customerIds.Select(id => Notification.ForPriceDrop(
                id, book, e.OldPrice, book.Price.Amount, e.Currency, e.OccurredOnUtc.UtcTicks)).ToList(), ct);
    }
}

public sealed class MuhaqqiqWorkNotificationHandler(
    IBookRepository bookRepository,
    IMuhaqqiqRepository muhaqqiqRepository,
    IMuhaqqiqFollowRepository followRepository,
    NotificationWriter writer) : IOutboxMessageHandler
{
    public string MessageType => nameof(MuhaqqiqWorkAddedDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<MuhaqqiqWorkAddedDomainEvent>(payloadJson);

        var book = await bookRepository.GetByIdAsync(e.BookId, ct);
        if (book is null || !book.IsActive)
            return;

        var muhaqqiqs = await muhaqqiqRepository.ListByIdsAsync(e.MuhaqqiqIds.ToList(), ct);
        var candidates = new List<Notification>();

        foreach (var muhaqqiq in muhaqqiqs.Where(m => m.IsActive))
        {
            var followerIds = await followRepository.ListFollowerIdsAsync(muhaqqiq.Id, ct);
            candidates.AddRange(followerIds.Select(id => Notification.ForNewFromMuhaqqiq(id, book, muhaqqiq)));
        }

        await writer.AddNewAsync(candidates, ct);
    }
}