using BookStore.Domain.Catalog;

namespace BookStore.Application.Abstractions.Repositories;

public interface IMuhaqqiqRepository
{
    Task<Muhaqqiq?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Muhaqqiq?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<IReadOnlyList<Muhaqqiq>> ListAsync(bool includeInactive, CancellationToken ct = default);
    Task<IReadOnlyList<Muhaqqiq>> ListByIdsAsync(IReadOnlyCollection<int> ids, CancellationToken ct = default);
    Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default);
    void Add(Muhaqqiq muhaqqiq);
    void Remove(Muhaqqiq muhaqqiq);
}