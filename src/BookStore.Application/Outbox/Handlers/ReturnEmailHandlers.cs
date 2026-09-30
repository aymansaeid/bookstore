using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Abstractions.Outbox;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Emails;
using BookStore.Domain.Returns.Events;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Outbox.Handlers;

public sealed class ReturnRequestedEmailHandler(
    IAdminUserRepository adminUserRepository,
    IEmailSender emailSender,
    IOptions<StoreOptions> storeOptions,
    ILogger<ReturnRequestedEmailHandler> logger) : IOutboxMessageHandler
{
    public string MessageType => nameof(ReturnRequestedDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<ReturnRequestedDomainEvent>(payloadJson);

        var recipients = await adminUserRepository.ListActiveEmailsAsync(ct);
        if (recipients.Count == 0)
        {
            logger.LogWarning("Return requested for {OrderNumber} but no active admin to notify.", e.OrderNumber);
            return;
        }

        foreach (var recipient in recipients)
            await emailSender.SendAsync(ReturnEmailTemplates.RequestedToAdmin(recipient, e, storeOptions.Value), ct);
    }
}

public sealed class ReturnApprovedEmailHandler(
    IReturnRequestRepository returnRepository,
    IEmailSender emailSender,
    IOptions<StoreOptions> storeOptions) : IOutboxMessageHandler
{
    public string MessageType => nameof(ReturnApprovedDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<ReturnApprovedDomainEvent>(payloadJson);
        var request = await returnRepository.GetByIdAsync(e.ReturnRequestId, ct);

        if (request is not null)
            await emailSender.SendAsync(ReturnEmailTemplates.Approved(request, storeOptions.Value), ct);
    }
}

public sealed class ReturnRejectedEmailHandler(
    IReturnRequestRepository returnRepository,
    IEmailSender emailSender,
    IOptions<StoreOptions> storeOptions) : IOutboxMessageHandler
{
    public string MessageType => nameof(ReturnRejectedDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<ReturnRejectedDomainEvent>(payloadJson);
        var request = await returnRepository.GetByIdAsync(e.ReturnRequestId, ct);

        if (request is not null)
            await emailSender.SendAsync(ReturnEmailTemplates.Rejected(request, storeOptions.Value), ct);
    }
}

public sealed class ReturnCompletedEmailHandler(
    IReturnRequestRepository returnRepository,
    IEmailSender emailSender,
    IOptions<StoreOptions> storeOptions) : IOutboxMessageHandler
{
    public string MessageType => nameof(ReturnCompletedDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<ReturnCompletedDomainEvent>(payloadJson);
        var request = await returnRepository.GetByIdAsync(e.ReturnRequestId, ct);

        if (request is not null)
            await emailSender.SendAsync(ReturnEmailTemplates.Completed(request, storeOptions.Value), ct);
    }
}