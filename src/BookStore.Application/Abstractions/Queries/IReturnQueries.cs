using BookStore.Application.Common;
using BookStore.Application.Returns;
using BookStore.Domain.Returns;

namespace BookStore.Application.Abstractions.Queries;

public interface IReturnQueries
{
    Task<PagedResult<AdminReturnSummaryDto>> ListAsync(
        ReturnStatus? status, int page, int pageSize, CancellationToken ct = default);
}