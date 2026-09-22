using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Abstractions.Outbox;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Emails;
using BookStore.Domain.Orders.Events;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Outbox.Handlers;

/// Handlers load the order fresh rather than rebuilding it from the event
/// payload: the event only needs to say what happened, and the email gets
/// accurate line items, totals and address without bloating the event.
public sealed class OrderPaidEmailHandler(
    IOrderRepository orderRepository,
    IEmailSender emailSender,
    IOptions<StoreOptions> storeOptions,
    ILogger<OrderPaidEmailHandler> logger) : IOutboxMessageHandler
{
    public string MessageType => nameof(OrderPaidDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<OrderPaidDomainEvent>(payloadJson);

        var order = await orderRepository.GetByIdAsync(e.OrderId, ct);
        if (order is null)
        {
            // Nothing to retry toward — treat as done rather than looping
            // until dead-letter.
            logger.LogWarning("Order {OrderId} no longer exists; skipping confirmation email.", e.OrderId);
            return;
        }

        await emailSender.SendAsync(OrderEmailTemplates.OrderConfirmation(order, storeOptions.Value), ct);
    }
}

public sealed class OrderShippedEmailHandler(
    IOrderRepository orderRepository,
    IEmailSender emailSender,
    IOptions<StoreOptions> storeOptions,
    ILogger<OrderShippedEmailHandler> logger) : IOutboxMessageHandler
{
    public string MessageType => nameof(OrderShippedDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<OrderShippedDomainEvent>(payloadJson);

        var order = await orderRepository.GetByIdAsync(e.OrderId, ct);
        if (order is null)
        {
            logger.LogWarning("Order {OrderId} no longer exists; skipping shipped email.", e.OrderId);
            return;
        }

        await emailSender.SendAsync(OrderEmailTemplates.OrderShipped(order, storeOptions.Value), ct);
    }
}

public sealed class OrderCancelledEmailHandler(
    IOrderRepository orderRepository,
    IEmailSender emailSender,
    IOptions<StoreOptions> storeOptions,
    ILogger<OrderCancelledEmailHandler> logger) : IOutboxMessageHandler
{
    public string MessageType => nameof(OrderCancelledDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<OrderCancelledDomainEvent>(payloadJson);

        var order = await orderRepository.GetByIdAsync(e.OrderId, ct);
        if (order is null)
        {
            logger.LogWarning("Order {OrderId} no longer exists; skipping cancellation email.", e.OrderId);
            return;
        }

        // WasPaid comes from the event, not the order: by now the order is
        // Cancelled and no longer remembers whether it had been paid.
        await emailSender.SendAsync(
            OrderEmailTemplates.OrderCancelled(order, e.WasPaid, storeOptions.Value), ct);
    }
}