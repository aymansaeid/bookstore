using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Books;
using BookStore.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class CategoryRepository(BookStoreDbContext dbContext) : ICategoryRepository
{
    public Task<Category?> GetByIdAsync(int id, CancellationToken ct = default) =>
        dbContext.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);

    public Task<Category?> GetBySlugAsync(string slug, CancellationToken ct = default) =>
        dbContext.Categories.FirstOrDefaultAsync(c => c.Slug == Slug.Create(slug), ct);

    public async Task<IReadOnlyList<Category>> ListAsync(bool includeInactive, CancellationToken ct = default) =>
        await dbContext.Categories
            .AsNoTracking()
            .Where(c => includeInactive || c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Name)
            .ToListAsync(ct);

    public Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default) =>
        dbContext.Categories.AnyAsync(c => c.Slug == Slug.Create(slug), ct);

    public Task<bool> HasChildrenAsync(int categoryId, CancellationToken ct = default) =>
        dbContext.Categories.AnyAsync(c => c.ParentId == categoryId, ct);

    public void Add(Category category) => dbContext.Categories.Add(category);

    public void Remove(Category category) => dbContext.Categories.Remove(category);
}

public sealed class MuhaqqiqRepository(BookStoreDbContext dbContext) : IMuhaqqiqRepository
{
    public Task<Muhaqqiq?> GetByIdAsync(int id, CancellationToken ct = default) =>
        dbContext.Muhaqqiqs.FirstOrDefaultAsync(m => m.Id == id, ct);

    public Task<Muhaqqiq?> GetBySlugAsync(string slug, CancellationToken ct = default) =>
        dbContext.Muhaqqiqs.FirstOrDefaultAsync(m => m.Slug == Slug.Create(slug), ct);

    public async Task<IReadOnlyList<Muhaqqiq>> ListAsync(bool includeInactive, CancellationToken ct = default) =>
        await dbContext.Muhaqqiqs
            .AsNoTracking()
            .Where(m => includeInactive || m.IsActive)
            .OrderBy(m => m.DisplayOrder)
            .ThenBy(m => m.Name)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Muhaqqiq>> ListByIdsAsync(IReadOnlyCollection<int> ids, CancellationToken ct = default) =>
        await dbContext.Muhaqqiqs.AsNoTracking().Where(m => ids.Contains(m.Id)).ToListAsync(ct);

    public Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default) =>
        dbContext.Muhaqqiqs.AnyAsync(m => m.Slug == Slug.Create(slug), ct);

    public void Add(Muhaqqiq muhaqqiq) => dbContext.Muhaqqiqs.Add(muhaqqiq);

    public void Remove(Muhaqqiq muhaqqiq) => dbContext.Muhaqqiqs.Remove(muhaqqiq);
}