namespace BookStore.Infrastructure.Persistence.Outbox;

public sealed class OutboxMessage
{
    public const int MaxAttempts = 5;

    public Guid Id { get; private set; }
    public string Type { get; private set; } = string.Empty;
    public string PayloadJson { get; private set; } = string.Empty;
    public DateTimeOffset OccurredOnUtc { get; private set; }
    public DateTimeOffset? ProcessedOnUtc { get; private set; }
    public string? Error { get; private set; }
    public int RetryCount { get; private set; }

    /// Earliest time the worker may try again. Set on creation so the first
    /// attempt is immediate, then pushed out by exponential backoff.
    public DateTimeOffset NextAttemptAtUtc { get; private set; }

    /// Gave up after MaxAttempts. Left in the table for an admin to inspect
    /// rather than deleted, and never picked up again.
    public bool IsDeadLettered { get; private set; }

    private OutboxMessage() { } // EF Core

    public static OutboxMessage Create(string type, string payloadJson, DateTimeOffset occurredOnUtc) =>
        new()
        {
            Id = Guid.NewGuid(),
            Type = type,
            PayloadJson = payloadJson,
            OccurredOnUtc = occurredOnUtc,
            NextAttemptAtUtc = occurredOnUtc
        };

    public void MarkProcessed()
    {
        ProcessedOnUtc = DateTimeOffset.UtcNow;
        Error = null;
    }

    public void MarkFailed(string error)
    {
        RetryCount++;
        // Truncate: a stack trace can be huge and the column is capped.
        Error = error.Length > 2000 ? error[..2000] : error;

        if (RetryCount >= MaxAttempts)
        {
            IsDeadLettered = true;
            return;
        }

        // 1, 2, 4, 8 minutes — enough to ride out a brief SMTP outage
        // without hammering it.
        var delayMinutes = Math.Pow(2, RetryCount - 1);
        NextAttemptAtUtc = DateTimeOffset.UtcNow.AddMinutes(delayMinutes);
    }
}