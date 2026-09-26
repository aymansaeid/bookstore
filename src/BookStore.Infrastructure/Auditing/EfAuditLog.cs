using System.Text.Json;
using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Common;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Auditing;

public sealed class EfAuditLog(BookStoreDbContext dbContext, ICurrentActor currentActor)
    : IAuditLog, IAuditLogQueries
{
    private const int MaxDetailsLength = 4000;

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private AuditLogEntry? _pending;

    public void Record(string action, string entityType, string? entityId, object details)
    {
        _pending = AuditLogEntry.Create(
            currentActor.AdminUserId, currentActor.DisplayName, action, entityType, entityId, Serialize(details));

        dbContext.Set<AuditLogEntry>().Add(_pending);
    }

    public void DiscardPending()
    {
        if (_pending is null)
            return;

        var entry = dbContext.Entry(_pending);

        // Only detach if it hasn't been written yet. If the handler saved
        // before failing, the entry accurately records what was saved.
        if (entry.State == EntityState.Added)
            entry.State = EntityState.Detached;

        _pending = null;
    }

    public async Task<PagedResult<AuditLogEntryDto>> ListAsync(AuditLogFilter filter, CancellationToken ct = default)
    {
        var query = dbContext.Set<AuditLogEntry>().AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.EntityType))
            query = query.Where(e => e.EntityType == filter.EntityType);
        if (!string.IsNullOrWhiteSpace(filter.EntityId))
            query = query.Where(e => e.EntityId == filter.EntityId);
        if (filter.AdminUserId is { } adminId)
            query = query.Where(e => e.AdminUserId == adminId);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(e => e.Id)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(e => new AuditLogEntryDto(
                e.Id, e.OccurredAtUtc, e.AdminUserId, e.ActorName, e.Action, e.EntityType, e.EntityId, e.DetailsJson))
            .ToListAsync(ct);

        return new PagedResult<AuditLogEntryDto>(items, filter.Page, filter.PageSize, total);
    }

    private static string Serialize(object details)
    {
        try
        {
            var json = JsonSerializer.Serialize(details, details.GetType(), SerializerOptions);
            return json.Length > MaxDetailsLength ? json[..MaxDetailsLength] : json;
        }
        catch (Exception ex)
        {
            // An unserializable payload must never block the admin action.
            return JsonSerializer.Serialize(new { serializationError = ex.GetType().Name });
        }
    }
}