using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Common;
using FluentValidation;

namespace BookStore.Application.Auditing.Queries;

public sealed record ListAuditLogQuery(
    string? EntityType, string? EntityId, int? AdminUserId, int Page = 1, int PageSize = 50)
    : IQuery<PagedResult<AuditLogEntryDto>>;

public sealed class ListAuditLogQueryValidator : AbstractValidator<ListAuditLogQuery>
{
    public ListAuditLogQueryValidator()
    {
        RuleFor(x => x.EntityType).MaximumLength(100);
        RuleFor(x => x.EntityId).MaximumLength(200);
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
    }
}

public sealed class ListAuditLogQueryHandler(IAuditLogQueries auditLogQueries)
    : IQueryHandler<ListAuditLogQuery, PagedResult<AuditLogEntryDto>>
{
    public async Task<Result<PagedResult<AuditLogEntryDto>>> Handle(ListAuditLogQuery query, CancellationToken ct) =>
        Result.Success(await auditLogQueries.ListAsync(
            new AuditLogFilter(query.EntityType, query.EntityId, query.AdminUserId, query.Page, query.PageSize), ct));
}