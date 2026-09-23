using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Abstractions.Outbox;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Emails;
using BookStore.Domain.Books.Events;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Outbox.Handlers;

public sealed class BookBackInStockHandler(
    IBookRepository bookRepository,
    IStockNotificationRepository notificationRepository,
    IEmailSender emailSender,
    IUnitOfWork unitOfWork,
    IOptions<StoreOptions> storeOptions,
    ILogger<BookBackInStockHandler> logger) : IOutboxMessageHandler
{
    public string MessageType => nameof(BookBackInStockDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<BookBackInStockDomainEvent>(payloadJson);

        var book = await bookRepository.GetByIdAsync(e.BookId, ct);
        if (book is null)
        {
            logger.LogWarning("Book {BookId} no longer exists; skipping back-in-stock notifications.", e.BookId);
            return;
        }

        var waiting = await notificationRepository.ListAwaitingNotificationAsync(e.BookId, ct);
        if (waiting.Count == 0)
            return;

        // Decision #4: mark everyone notified and COMMIT before sending a
        // single email. If the process dies mid-send, some people miss out —
        // far better than the outbox retrying and mailing the whole list a
        // second time.
        foreach (var notification in waiting)
            notification.MarkNotified();

        await unitOfWork.SaveChangesAsync(ct);

        logger.LogInformation(
            "Notifying {Count} subscriber(s) that '{Title}' is back in stock.", waiting.Count, book.Title);

        var sent = 0;
        foreach (var notification in waiting)
        {
            try
            {
                await emailSender.SendAsync(
                    StockNotificationEmailTemplates.BackInStock(
                        notification.Email, book.Title, book.Slug.Value,
                        // The plaintext token is gone (we only stored the
                        // hash), so unsubscribe links here carry the
                        // notification id instead — see the controller.
                        notification.Id.ToString(), storeOptions.Value), ct);

                sent++;
            }
            catch (Exception ex)
            {
                // One bad address must not stop the rest of the list.
                logger.LogError(ex, "Failed to send back-in-stock email to {Email}", notification.Email);
            }
        }

        logger.LogInformation("Sent {Sent}/{Total} back-in-stock emails for '{Title}'.",
            sent, waiting.Count, book.Title);
    }
}