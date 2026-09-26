using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Common;
using MediatR;

namespace BookStore.Application.Behaviors;

public sealed class AuditBehavior<TRequest, TResponse>(IAuditLog auditLog)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        // Runtime check rather than a generic constraint: works on every DI
        // container without relying on constrained open-generic support.
        if (request is not IAuditableCommand auditable)
            return await next();

        // Recorded BEFORE the handler runs so the handler's own SaveChanges
        // writes it: the audit row and the change it describes commit
        // together, or neither does.
        auditLog.Record(ActionName, auditable.AuditEntityType, auditable.AuditEntityId, auditable.AuditDetails);

        try
        {
            var response = await next();

            if (response is Result { IsFailure: true })
                auditLog.DiscardPending();

            return response;
        }
        catch
        {
            auditLog.DiscardPending();
            throw;
        }
    }

    private static string ActionName
    {
        get
        {
            var name = typeof(TRequest).Name;
            return name.EndsWith("Command", StringComparison.Ordinal) ? name[..^"Command".Length] : name;
        }
    }
}