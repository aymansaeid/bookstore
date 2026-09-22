using BookStore.Application.Abstractions.Outbox;
using BookStore.Domain.Common;
using BookStore.Infrastructure.Persistence.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Text.Json;

namespace BookStore.Infrastructure.Persistence.Interceptors;

public sealed class DomainEventsToOutboxInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, InterceptionResult<int> result)
    {
        ConvertDomainEventsToOutboxMessages(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        ConvertDomainEventsToOutboxMessages(eventData.Context);
        return base.SavingChangesAsync(eventData, result, ct);
    }

    private static void ConvertDomainEventsToOutboxMessages(DbContext? context)
    {
        if (context is null) return;

        // AggregateRoot<int> is the common base for every aggregate we've
        // written (Book, Order, Coupon, ShippingZone, AdminUser all key on
        // int), so this one query catches events raised by any of them.
        var aggregatesWithEvents = context.ChangeTracker
            .Entries<AggregateRoot<int>>()
            .Select(e => e.Entity)
            .Where(a => a.DomainEvents.Count > 0)
            .ToList();

        var outboxMessages = aggregatesWithEvents
            .SelectMany(a => a.DomainEvents)
            .Select(domainEvent => OutboxMessage.Create(
                domainEvent.GetType().Name,
                JsonSerializer.Serialize(domainEvent, domainEvent.GetType(), OutboxSerialization.Options),
                domainEvent.OccurredOnUtc))
            .ToList();

        context.Set<OutboxMessage>().AddRange(outboxMessages);

        foreach (var aggregate in aggregatesWithEvents)
            aggregate.ClearDomainEvents();
    }
}