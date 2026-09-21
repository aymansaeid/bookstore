namespace BookStore.Infrastructure.Persistence.Outbox;

public sealed class OutboxMessage
{
    public Guid Id { get; private set; }
    public string Type { get; private set; } = string.Empty;
    public string PayloadJson { get; private set; } = string.Empty;
    public DateTimeOffset OccurredOnUtc { get; private set; }
    public DateTimeOffset? ProcessedOnUtc { get; private set; }
    public string? Error { get; private set; }
    public int RetryCount { get; private set; }

    private OutboxMessage() { } // EF Core

    public static OutboxMessage Create(string type, string payloadJson, DateTimeOffset occurredOnUtc) =>
        new() { Id = Guid.NewGuid(), Type = type, PayloadJson = payloadJson, OccurredOnUtc = occurredOnUtc };

    public void MarkProcessed() => ProcessedOnUtc = DateTimeOffset.UtcNow;

    public void MarkFailed(string error)
    {
        Error = error;
        RetryCount++;
    }
}