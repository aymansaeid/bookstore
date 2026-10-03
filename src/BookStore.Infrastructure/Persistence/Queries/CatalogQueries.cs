using BookStore.Application.Abstractions.Queries;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Queries;

public sealed class CatalogQueries(BookStoreDbContext dbContext) : ICatalogQueries
{
    public async Task<IReadOnlyDictionary<int, int>> CountBooksPerCategoryAsync(
        bool activeBooksOnly, CancellationToken ct = default) =>
        await dbContext.Books
            .AsNoTracking()
            .Where(b => b.CategoryId != null && (!activeBooksOnly || b.IsActive))
            .GroupBy(b => b.CategoryId!.Value)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count, ct);

    public async Task<IReadOnlyDictionary<int, int>> CountBooksPerMuhaqqiqAsync(
        bool activeBooksOnly, CancellationToken ct = default) =>
        await dbContext.Books
            .AsNoTracking()
            .Where(b => !activeBooksOnly || b.IsActive)
            .SelectMany(b => b.Muhaqqiqs)
            .GroupBy(link => link.MuhaqqiqId)
            .Select(g => new { MuhaqqiqId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.MuhaqqiqId, x => x.Count, ct);
}