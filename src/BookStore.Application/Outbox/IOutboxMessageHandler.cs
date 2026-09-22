using System.Text.Json;

namespace BookStore.Application.Abstractions.Outbox;

public interface IOutboxMessageHandler
{
    /// Matches OutboxMessage.Type, which the interceptor writes as the
    /// domain event's type name.
    string MessageType { get; }

    Task HandleAsync(string payloadJson, CancellationToken ct);
}

public static class OutboxSerialization
{
    /// Shared by the interceptor (writing) and handlers (reading), so the
    /// two can never drift apart.
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public static T Deserialize<T>(string payloadJson) =>
        JsonSerializer.Deserialize<T>(payloadJson, Options)
        ?? throw new InvalidOperationException($"Outbox payload deserialized to null for {typeof(T).Name}.");
}