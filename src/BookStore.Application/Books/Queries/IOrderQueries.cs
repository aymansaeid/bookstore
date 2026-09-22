using BookStore.Application.Common;
using BookStore.Application.Orders;
using BookStore.Domain.Orders;

namespace BookStore.Application.Abstractions.Queries;

public sealed record OrderListFilter(OrderStatus? Status, string? Search, int Page, int PageSize);

/// Read-side only: projects straight to DTOs, never loads aggregates.
/// Anything that CHANGES an order still goes through IOrderRepository
/// and the Order aggregate's rules.
public interface IOrderQueries
{
    Task<PagedResult<AdminOrderSummaryDto>> ListAsync(OrderListFilter filter, CancellationToken ct = default);
}