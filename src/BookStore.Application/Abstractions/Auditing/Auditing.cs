namespace BookStore.Application.Abstractions.Auditing;

/// Opt-in marker for commands that should appear in the admin audit log.
public interface IAuditableCommand
{
    string AuditEntityType { get; }
    string? AuditEntityId { get; }

    /// What gets serialized into the log. Defaults to the command itself.
    /// Any command carrying a secret (password) or a stream (file upload)
    /// MUST override this.
    object AuditDetails => this;
}

public interface IAuditLog
{
    /// Adds an entry to the current unit of work. It's written by the next
    /// SaveChanges, so it commits atomically with the change it describes.
    void Record(string action, string entityType, string? entityId, object details);

    /// Drops a recorded-but-unsaved entry (the command failed).
    void DiscardPending();
}

public sealed record AuditLogEntryDto(
    long Id,
    DateTimeOffset OccurredAtUtc,
    int? AdminUserId,
    string ActorName,
    string Action,
    string EntityType,
    string? EntityId,
    string DetailsJson);

public sealed record AuditLogFilter(string? EntityType, string? EntityId, int? AdminUserId, int Page, int PageSize);

public interface IAuditLogQueries
{
    Task<Common.PagedResult<AuditLogEntryDto>> ListAsync(AuditLogFilter filter, CancellationToken ct = default);
}