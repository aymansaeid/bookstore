using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Abstractions.Outbox;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Emails;
using BookStore.Domain.Orders.Events;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Outbox.Handlers;

public sealed class OrderCancelledByCustomerAdminHandler(
    IAdminUserRepository adminUserRepository,
    IEmailSender emailSender,
    IOptions<StoreOptions> storeOptions) : IOutboxMessageHandler
{
    public string MessageType => nameof(OrderCancelledDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<OrderCancelledDomainEvent>(payloadJson);

        // Only paid orders matter: an unpaid one was never going to be packed.
        if (!e.ByCustomer || !e.WasPaid)
            return;

        foreach (var admin in await adminUserRepository.ListActiveEmailsAsync(ct))
            await emailSender.SendAsync(
                AdminEmailTemplates.OrderCancelledByCustomer(admin, e.OrderNumber, storeOptions.Value), ct);
    }
}