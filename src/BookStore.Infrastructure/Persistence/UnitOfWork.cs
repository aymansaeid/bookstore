using BookStore.Application.Abstractions;
using BookStore.Application.Common;
using Microsoft.EntityFrameworkCore;

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
}