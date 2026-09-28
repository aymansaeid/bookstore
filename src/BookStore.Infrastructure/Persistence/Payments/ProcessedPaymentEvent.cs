namespace BookStore.Infrastructure.Persistence.Payments;

public sealed class ProcessedPaymentEvent
{
    public Guid Id { get; private set; }
    public string EventId { get; private set; } = string.Empty;
    public string EventType { get; private set; } = string.Empty;
    public DateTimeOffset ProcessedAtUtc { get; private set; }

    private ProcessedPaymentEvent() { } // EF Core

    public static ProcessedPaymentEvent Create(string eventId, string eventType) =>
        new()
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            EventType = eventType,
            ProcessedAtUtc = DateTimeOffset.UtcNow
        };
}