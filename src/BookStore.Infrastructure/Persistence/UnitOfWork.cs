using BookStore.Application.Abstractions;

namespace BookStore.Infrastructure.Persistence;

public sealed class UnitOfWork(BookStoreDbContext dbContext) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct = default) => dbContext.SaveChangesAsync(ct);
}