using BookStore.Domain.Returns;

namespace BookStore.Application.Abstractions.Repositories;

public interface IReturnRequestRepository
{
    Task<ReturnRequest?> GetByIdAsync(int id, CancellationToken ct = default);

    /// The request that blocks a new one: Requested, Approved or Completed.
    Task<ReturnRequest?> GetBlockingForOrderAsync(int orderId, CancellationToken ct = default);

    /// The most recent request of any status, for the customer status page.
    Task<ReturnRequest?> GetLatestForOrderAsync(int orderId, CancellationToken ct = default);

    void Add(ReturnRequest request);
}