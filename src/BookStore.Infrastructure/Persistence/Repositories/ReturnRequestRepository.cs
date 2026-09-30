using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Returns;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class ReturnRequestRepository(BookStoreDbContext dbContext) : IReturnRequestRepository
{
    private static readonly ReturnStatus[] BlockingStatuses =
        [ReturnStatus.Requested, ReturnStatus.Approved, ReturnStatus.Completed];

    public Task<ReturnRequest?> GetByIdAsync(int id, CancellationToken ct = default) =>
        dbContext.ReturnRequests.Include(r => r.Lines).FirstOrDefaultAsync(r => r.Id == id, ct);

    public Task<ReturnRequest?> GetBlockingForOrderAsync(int orderId, CancellationToken ct = default) =>
        dbContext.ReturnRequests
            .Include(r => r.Lines)
            .FirstOrDefaultAsync(r => r.OrderId == orderId && BlockingStatuses.Contains(r.Status), ct);

    public Task<ReturnRequest?> GetLatestForOrderAsync(int orderId, CancellationToken ct = default) =>
        dbContext.ReturnRequests
            .Include(r => r.Lines)
            .Where(r => r.OrderId == orderId)
            .OrderByDescending(r => r.RequestedAtUtc)
            .FirstOrDefaultAsync(ct);

    public void Add(ReturnRequest request) => dbContext.ReturnRequests.Add(request);
}