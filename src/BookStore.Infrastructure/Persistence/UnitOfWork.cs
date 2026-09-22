using BookStore.Application.Abstractions;
using BookStore.Application.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace BookStore.Infrastructure.Persistence;

public sealed class UnitOfWork(BookStoreDbContext dbContext) : IUnitOfWork
{
    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        try
        {
            return await dbContext.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            throw new ConcurrencyConflictException(
                "This record was changed by another operation. Reload it and try again.", ex);
        }
    }

    // ExecuteUpdateAsync calls (our atomic stock/coupon updates) run on the
    // same connection and automatically join this transaction, so they
    // commit or roll back together with SaveChanges.
    //
    // Note: if you ever enable EnableRetryOnFailure() on SQL Server, manual
    // transactions like this must be wrapped in the execution strategy.
    // We don't use it, so this is fine as-is.
    public async Task<ITransaction> BeginTransactionAsync(CancellationToken ct = default) =>
        new EfTransaction(await dbContext.Database.BeginTransactionAsync(ct));

    private sealed class EfTransaction(IDbContextTransaction transaction) : ITransaction
    {
        public Task CommitAsync(CancellationToken ct = default) => transaction.CommitAsync(ct);
        public ValueTask DisposeAsync() => transaction.DisposeAsync();
    }
}