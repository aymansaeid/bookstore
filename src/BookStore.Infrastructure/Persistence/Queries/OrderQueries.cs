using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Common;
using BookStore.Application.Orders;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Queries;

public sealed class OrderQueries(BookStoreDbContext dbContext) : IOrderQueries
{
    public async Task<PagedResult<AdminOrderSummaryDto>> ListAsync(
        OrderListFilter filter, CancellationToken ct = default)
    {
        var query = dbContext.Orders.AsNoTracking();

        if (filter.Status is { } status)
            query = query.Where(o => o.Status == status);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            query = query.Where(o => o.OrderNumber.Contains(term) || o.CustomerEmail.Contains(term));
        }

        var totalCount = await query.CountAsync(ct);

        // Projection: SQL selects only these columns. No lines loaded,
        // no change tracking, no aggregate materialization.
        var items = await query
            .OrderByDescending(o => o.CreatedAtUtc)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(o => new AdminOrderSummaryDto(
                o.Id,
                o.OrderNumber,
                o.CustomerEmail,
                o.ShippingAddress.RecipientName,
                o.ShippingAddress.CountryCode,
                o.Status,
                o.Lines.Sum(l => l.Quantity),
                o.Total.Amount,
                o.Total.Currency,
                o.CreatedAtUtc,
                o.PaidAtUtc,
                o.ShippedAtUtc))
            .ToListAsync(ct);

        return new PagedResult<AdminOrderSummaryDto>(items, filter.Page, filter.PageSize, totalCount);
    }
}