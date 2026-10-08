using BookStore.Domain.ReadingPaths;

namespace BookStore.Application.Abstractions.Repositories;

public interface IReadingPathRepository
{
    Task<ReadingPath?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<ReadingPath?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<IReadOnlyList<ReadingPath>> ListAsync(bool includeInactive, CancellationToken ct = default);
    Task<IReadOnlyList<ReadingPath>> ListByIdsAsync(IReadOnlyCollection<int> ids, CancellationToken ct = default);
    Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default);
    void Add(ReadingPath path);
    void Remove(ReadingPath path);
}

public interface IPathEnrollmentRepository
{
    Task<PathEnrollment?> GetAsync(int customerId, int readingPathId, CancellationToken ct = default);
    Task<IReadOnlyList<PathEnrollment>> ListByCustomerAsync(int customerId, CancellationToken ct = default);
    Task<IReadOnlyDictionary<int, int>> CountPerPathAsync(CancellationToken ct = default);
    void Add(PathEnrollment enrollment);
    void Remove(PathEnrollment enrollment);
    Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default);
}