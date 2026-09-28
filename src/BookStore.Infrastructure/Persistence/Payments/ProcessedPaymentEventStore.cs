using BookStore.Application.Abstractions.Payments;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Payments;

public sealed class ProcessedPaymentEventStore(BookStoreDbContext dbContext) : IProcessedPaymentEventStore
{
    public Task<bool> ExistsAsync(string eventId, CancellationToken ct = default) =>
        dbContext.ProcessedPaymentEvents.AnyAsync(e => e.EventId == eventId, ct);

    public void Add(string eventId, string eventType) =>
        dbContext.ProcessedPaymentEvents.Add(ProcessedPaymentEvent.Create(eventId, eventType));
}