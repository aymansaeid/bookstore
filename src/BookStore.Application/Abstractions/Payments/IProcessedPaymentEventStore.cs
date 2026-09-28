namespace BookStore.Application.Abstractions.Payments;

/// Remembers which gateway events have been handled, so a redelivered event
/// (gateways retry freely) is recognized and ignored.
public interface IProcessedPaymentEventStore
{
    Task<bool> ExistsAsync(string eventId, CancellationToken ct = default);

    /// Staged in the current unit of work. The unique index on EventId is
    /// the real guarantee if two deliveries race.
    void Add(string eventId, string eventType);
}