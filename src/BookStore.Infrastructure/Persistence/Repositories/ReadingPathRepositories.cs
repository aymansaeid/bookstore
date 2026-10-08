using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Books;
using BookStore.Domain.ReadingPaths;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class ReadingPathRepository(BookStoreDbContext dbContext) : IReadingPathRepository
{
    public Task<ReadingPath?> GetByIdAsync(int id, CancellationToken ct = default) =>
        dbContext.ReadingPaths.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<ReadingPath?> GetBySlugAsync(string slug, CancellationToken ct = default) =>
        dbContext.ReadingPaths.FirstOrDefaultAsync(p => p.Slug == Slug.Create(slug), ct);

    public async Task<IReadOnlyList<ReadingPath>> ListAsync(bool includeInactive, CancellationToken ct = default) =>
        await dbContext.ReadingPaths.AsNoTracking().Where(p => includeInactive || p.IsActive).ToListAsync(ct);

    public async Task<IReadOnlyList<ReadingPath>> ListByIdsAsync(IReadOnlyCollection<int> ids, CancellationToken ct = default) =>
        await dbContext.ReadingPaths.AsNoTracking().Where(p => ids.Contains(p.Id)).ToListAsync(ct);

    public Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default) =>
        dbContext.ReadingPaths.AnyAsync(p => p.Slug == Slug.Create(slug), ct);

    public void Add(ReadingPath path) => dbContext.ReadingPaths.Add(path);

    public void Remove(ReadingPath path) => dbContext.ReadingPaths.Remove(path);
}

public sealed class PathEnrollmentRepository(BookStoreDbContext dbContext) : IPathEnrollmentRepository
{
    public Task<PathEnrollment?> GetAsync(int customerId, int readingPathId, CancellationToken ct = default) =>
        dbContext.PathEnrollments.FirstOrDefaultAsync(e => e.CustomerId == customerId && e.ReadingPathId == readingPathId, ct);

    public async Task<IReadOnlyList<PathEnrollment>> ListByCustomerAsync(int customerId, CancellationToken ct = default) =>
        await dbContext.PathEnrollments.AsNoTracking().Where(e => e.CustomerId == customerId).ToListAsync(ct);

    public async Task<IReadOnlyDictionary<int, int>> CountPerPathAsync(CancellationToken ct = default) =>
        await dbContext.PathEnrollments
            .GroupBy(e => e.ReadingPathId)
            .Select(g => new { PathId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PathId, x => x.Count, ct);

    public void Add(PathEnrollment enrollment) => dbContext.PathEnrollments.Add(enrollment);

    public void Remove(PathEnrollment enrollment) => dbContext.PathEnrollments.Remove(enrollment);

    public async Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default) =>
        await dbContext.PathEnrollments.Where(e => e.CustomerId == customerId).ExecuteDeleteAsync(ct);
}