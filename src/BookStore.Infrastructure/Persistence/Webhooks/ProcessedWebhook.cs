namespace BookStore.Infrastructure.Persistence.Webhooks;

public sealed class ProcessedWebhook
{
    public Guid Id { get; private set; }
    public string StripeEventId { get; private set; } = string.Empty;
    public string EventType { get; private set; } = string.Empty;
    public DateTimeOffset ProcessedAtUtc { get; private set; }

    private ProcessedWebhook() { } // EF Core

    public static ProcessedWebhook Create(string stripeEventId, string eventType) =>
        new() { Id = Guid.NewGuid(), StripeEventId = stripeEventId, EventType = eventType, ProcessedAtUtc = DateTimeOffset.UtcNow };
}