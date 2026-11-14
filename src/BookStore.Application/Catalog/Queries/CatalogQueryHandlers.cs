using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Catalog;
using BookStore.Domain.Common;

namespace BookStore.Application.Catalog.Queries;

/// The full public tree: top-level categories with their subcategories.
/// A parent's BookCount includes its subcategories' books (home tiles).
public sealed record GetCategoryTreeQuery : IQuery<IReadOnlyList<PublicCategoryDto>>;

public sealed class GetCategoryTreeQueryHandler(
    ICategoryRepository repository, ICatalogQueries catalogQueries, ILanguageContext languageContext)
    : IQueryHandler<GetCategoryTreeQuery, IReadOnlyList<PublicCategoryDto>>
{
    public async Task<Result<IReadOnlyList<PublicCategoryDto>>> Handle(GetCategoryTreeQuery query, CancellationToken ct)
    {
        var categories = await repository.ListAsync(includeInactive: false, ct);
        var counts = await catalogQueries.CountBooksPerCategoryAsync(activeBooksOnly: true, ct);

        return Result.Success(CategoryTree.Build(categories, counts, languageContext.Current));
    }
}

public sealed record GetCategoryBySlugQuery(string Slug) : IQuery<PublicCategoryDto>;

public sealed class GetCategoryBySlugQueryHandler(
    ICategoryRepository repository, ICatalogQueries catalogQueries, ILanguageContext languageContext)
    : IQueryHandler<GetCategoryBySlugQuery, PublicCategoryDto>
{
    public async Task<Result<PublicCategoryDto>> Handle(GetCategoryBySlugQuery query, CancellationToken ct)
    {
        var categories = await repository.ListAsync(includeInactive: false, ct);
        var counts = await catalogQueries.CountBooksPerCategoryAsync(activeBooksOnly: true, ct);

        Category? match;
        try
        {
            var slug = Domain.Books.Slug.Create(query.Slug);
            match = categories.FirstOrDefault(c => c.Slug == slug);
        }
        catch (ArgumentException)
        {
            match = null;
        }

        // A subcategory whose parent is hidden is unreachable too.
        if (match is null || (match.ParentId is { } pid && categories.All(c => c.Id != pid)))
            return Result.Failure<PublicCategoryDto>(CatalogErrors.CategorySlugNotFound(query.Slug));

        var tree = CategoryTree.Build(categories, counts, languageContext.Current);

        var dto = tree.FirstOrDefault(t => t.Id == match.Id)
                  ?? tree.SelectMany(t => t.Children).First(c => c.Id == match.Id);

        return Result.Success(dto);
    }
}

public sealed record GetAdminCategoriesQuery : IQuery<IReadOnlyList<AdminCategoryDto>>;

public sealed class GetAdminCategoriesQueryHandler(ICategoryRepository repository, ICatalogQueries catalogQueries)
    : IQueryHandler<GetAdminCategoriesQuery, IReadOnlyList<AdminCategoryDto>>
{
    public async Task<Result<IReadOnlyList<AdminCategoryDto>>> Handle(GetAdminCategoriesQuery query, CancellationToken ct)
    {
        var categories = await repository.ListAsync(includeInactive: true, ct);
        var counts = await catalogQueries.CountBooksPerCategoryAsync(activeBooksOnly: false, ct);

        // Flat list; the admin UI builds the tree from ParentId.
        return Result.Success<IReadOnlyList<AdminCategoryDto>>(
            categories.Select(c => c.ToAdminDto(counts.GetValueOrDefault(c.Id))).ToList());
    }
}

public sealed record GetMuhaqqiqsQuery(bool FeaturedOnly) : IQuery<IReadOnlyList<PublicMuhaqqiqDto>>;

public sealed class GetMuhaqqiqsQueryHandler(
    IMuhaqqiqRepository repository, ICatalogQueries catalogQueries, ILanguageContext languageContext)
    : IQueryHandler<GetMuhaqqiqsQuery, IReadOnlyList<PublicMuhaqqiqDto>>
{
    public async Task<Result<IReadOnlyList<PublicMuhaqqiqDto>>> Handle(GetMuhaqqiqsQuery query, CancellationToken ct)
    {
        var language = languageContext.Current;
        var muhaqqiqs = await repository.ListAsync(includeInactive: false, ct);
        var counts = await catalogQueries.CountBooksPerMuhaqqiqAsync(activeBooksOnly: true, ct);

        return Result.Success<IReadOnlyList<PublicMuhaqqiqDto>>(muhaqqiqs
            .Where(m => !query.FeaturedOnly || m.IsFeatured)
            .OrderByDescending(m => m.IsFeatured)
            .ThenBy(m => m.DisplayOrder)
            .ThenBy(m => m.NameIn(language), StringComparer.Ordinal)
            .Select(m => m.ToPublicDto(counts.GetValueOrDefault(m.Id), language))
            .ToList());
    }
}

public sealed record GetMuhaqqiqBySlugQuery(string Slug) : IQuery<PublicMuhaqqiqDto>;

public sealed class GetMuhaqqiqBySlugQueryHandler(
    IMuhaqqiqRepository repository, ICatalogQueries catalogQueries, ILanguageContext languageContext)
    : IQueryHandler<GetMuhaqqiqBySlugQuery, PublicMuhaqqiqDto>
{
    public async Task<Result<PublicMuhaqqiqDto>> Handle(GetMuhaqqiqBySlugQuery query, CancellationToken ct)
    {
        Muhaqqiq? muhaqqiq;
        try
        {
            muhaqqiq = await repository.GetBySlugAsync(query.Slug, ct);
        }
        catch (ArgumentException)
        {
            muhaqqiq = null;
        }

        if (muhaqqiq is null || !muhaqqiq.IsActive)
            return Result.Failure<PublicMuhaqqiqDto>(CatalogErrors.MuhaqqiqSlugNotFound(query.Slug));

        var counts = await catalogQueries.CountBooksPerMuhaqqiqAsync(activeBooksOnly: true, ct);
        return Result.Success(muhaqqiq.ToPublicDto(counts.GetValueOrDefault(muhaqqiq.Id), languageContext.Current));
    }
}

public sealed record GetAdminMuhaqqiqsQuery : IQuery<IReadOnlyList<AdminMuhaqqiqDto>>;

public sealed class GetAdminMuhaqqiqsQueryHandler(IMuhaqqiqRepository repository, ICatalogQueries catalogQueries)
    : IQueryHandler<GetAdminMuhaqqiqsQuery, IReadOnlyList<AdminMuhaqqiqDto>>
{
    public async Task<Result<IReadOnlyList<AdminMuhaqqiqDto>>> Handle(GetAdminMuhaqqiqsQuery query, CancellationToken ct)
    {
        var muhaqqiqs = await repository.ListAsync(includeInactive: true, ct);
        var counts = await catalogQueries.CountBooksPerMuhaqqiqAsync(activeBooksOnly: false, ct);

        return Result.Success<IReadOnlyList<AdminMuhaqqiqDto>>(
            muhaqqiqs.Select(m => m.ToAdminDto(counts.GetValueOrDefault(m.Id))).ToList());
    }
}

internal static class CategoryTree
{
    public static IReadOnlyList<PublicCategoryDto> Build(
        IReadOnlyList<Category> activeCategories, IReadOnlyDictionary<int, int> directCounts,
        Language language = Language.Ar)
    {
        var childrenByParent = activeCategories
            .Where(c => c.ParentId is not null)
            .GroupBy(c => c.ParentId!.Value)
            .ToDictionary(g => g.Key, g => g
                .OrderBy(c => c.DisplayOrder)
                .ThenBy(c => c.NameIn(language), StringComparer.Ordinal)
                .ToList());

        return activeCategories
            .Where(c => c.IsTopLevel)
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.NameIn(language), StringComparer.Ordinal)
            .Select(top =>
            {
                var children = childrenByParent.GetValueOrDefault(top.Id, [])
                    .Select(child => ToDto(child, directCounts.GetValueOrDefault(child.Id), top.ToRef(language), [], language))
                    .ToList();

                return ToDto(top, directCounts.GetValueOrDefault(top.Id) + children.Sum(c => c.BookCount),
                    null, children, language);
            })
            .ToList();
    }

    private static PublicCategoryDto ToDto(
        Category c, int bookCount, CategoryRefDto? parent, IReadOnlyList<PublicCategoryDto> children, Language language) =>
        new(c.Id, c.Slug.Value, c.NameIn(language), c.Letter, c.DescriptionIn(language),
            bookCount, parent, children, c.Name);
}