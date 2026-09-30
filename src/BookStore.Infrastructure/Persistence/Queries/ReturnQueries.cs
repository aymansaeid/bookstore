using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Common;
using BookStore.Application.Returns;
using BookStore.Domain.Returns;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Queries;

public sealed class ReturnQueries(BookStoreDbContext dbContext) : IReturnQueries
{
    public async Task<PagedResult<AdminReturnSummaryDto>> ListAsync(
        ReturnStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = dbContext.ReturnRequests.AsNoTracking();

        if (status is { } s)
            query = query.Where(r => r.Status == s);

        var total = await query.CountAsync(ct);

        // Oldest first: returns are a queue, and the legal refund deadline
        // runs from the request date.
        var items = await query
            .OrderBy(r => r.RequestedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new AdminReturnSummaryDto(
                r.Id, r.OrderNumber, r.CustomerEmail, r.Status, r.Lines.Sum(l => l.Quantity),
                r.RefundAmount.Amount, r.RefundAmount.Currency, r.IsFullReturn, r.RequestedAtUtc))
            .ToListAsync(ct);

        return new PagedResult<AdminReturnSummaryDto>(items, page, pageSize, total);
    }
}