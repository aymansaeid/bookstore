namespace BookStore.Infrastructure.Persistence.Auditing;

public sealed class AuditLogEntry
{
    public long Id { get; private set; }
    public DateTimeOffset OccurredAtUtc { get; private set; }
    public int? AdminUserId { get; private set; }

    /// Snapshot of the actor's email at the time. If the admin account is
    /// later removed, the log still says who did it.
    public string ActorName { get; private set; } = string.Empty;

    public string Action { get; private set; } = string.Empty;
    public string EntityType { get; private set; } = string.Empty;
    public string? EntityId { get; private set; }
    public string DetailsJson { get; private set; } = string.Empty;

    private AuditLogEntry() { } // EF Core

    public static AuditLogEntry Create(
        int? adminUserId, string actorName, string action, string entityType, string? entityId, string detailsJson) =>
        new()
        {
            OccurredAtUtc = DateTimeOffset.UtcNow,
            AdminUserId = adminUserId,
            ActorName = actorName,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            DetailsJson = detailsJson
        };
}