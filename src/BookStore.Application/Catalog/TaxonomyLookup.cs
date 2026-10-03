using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Books;
using BookStore.Domain.Catalog;

namespace BookStore.Application.Catalog;

public sealed class TaxonomyLookup(
    IReadOnlyDictionary<int, Category> categories,
    IReadOnlyDictionary<int, Muhaqqiq> muhaqqiqs)
{
    public static readonly TaxonomyLookup Empty =
        new(new Dictionary<int, Category>(), new Dictionary<int, Muhaqqiq>());

    /// Null when the book has no category, or its category is hidden.
    public BookCategoryDto? CategoryFor(Book book)
    {
        if (book.CategoryId is not { } id || !categories.TryGetValue(id, out var category) || !category.IsActive)
            return null;

        CategoryRefDto? parent = null;
        if (category.ParentId is { } parentId && categories.TryGetValue(parentId, out var parentCategory))
            parent = parentCategory.ToRef();

        return new BookCategoryDto(category.Id, category.Slug.Value, category.Name, parent);
    }

    /// In credit order; hidden profiles are left out.
    public IReadOnlyList<MuhaqqiqRefDto> MuhaqqiqsFor(Book book) =>
        book.OrderedMuhaqqiqIds
            .Where(id => muhaqqiqs.TryGetValue(id, out var m) && m.IsActive)
            .Select(id => new MuhaqqiqRefDto(id, muhaqqiqs[id].Slug.Value, muhaqqiqs[id].Name))
            .ToList();
}

public sealed class TaxonomyLookupLoader(
    ICategoryRepository categoryRepository,
    IMuhaqqiqRepository muhaqqiqRepository)
{
    public async Task<TaxonomyLookup> LoadAsync(CancellationToken ct)
    {
        var categories = await categoryRepository.ListAsync(includeInactive: true, ct);
        var muhaqqiqs = await muhaqqiqRepository.ListAsync(includeInactive: true, ct);

        return new TaxonomyLookup(categories.ToDictionary(c => c.Id), muhaqqiqs.ToDictionary(m => m.Id));
    }
}