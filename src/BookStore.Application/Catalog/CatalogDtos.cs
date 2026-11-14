using BookStore.Domain.Catalog;
using BookStore.Domain.Common;

namespace BookStore.Application.Catalog;

public sealed record CategoryRefDto(int Id, string Slug, string Name);

/// A book's category, with its parent for breadcrumbs («الحديث › شروح الحديث»).
public sealed record BookCategoryDto(int Id, string Slug, string Name, CategoryRefDto? Parent);

public sealed record MuhaqqiqRefDto(int Id, string Slug, string Name);

public sealed record PublicCategoryDto(
    int Id, string Slug, string Name, string? Letter, string? Description,
    int BookCount, CategoryRefDto? Parent, IReadOnlyList<PublicCategoryDto> Children,
    string OriginalName);

public sealed record AdminCategoryDto(
    int Id, string Slug, string Name, string? Letter, string? Description,
    int? ParentId, int DisplayOrder, bool IsActive, int BookCount, IReadOnlyList<string> Translations);

public sealed record PublicMuhaqqiqDto(
    int Id, string Slug, string Name, string? Bio, IReadOnlyList<string> Specialties,
    bool IsFeatured, int WorksCount,
    string OriginalName);

public sealed record AdminMuhaqqiqDto(
    int Id, string Slug, string Name, string? Bio, IReadOnlyList<string> Specialties,
    bool IsFeatured, int DisplayOrder, bool IsActive, int WorksCount, IReadOnlyList<string> Translations  );

public static class CatalogMappings
{
    public static CategoryRefDto ToRef(this Category c, Language language = Language.Ar) =>
        new(c.Id, c.Slug.Value, c.NameIn(language));

    public static AdminCategoryDto ToAdminDto(this Category c, int bookCount) =>
        new(c.Id, c.Slug.Value, c.Name, c.Letter, c.Description, c.ParentId, c.DisplayOrder, c.IsActive, bookCount, c.TranslatedLanguages.Codes());

    public static PublicMuhaqqiqDto ToPublicDto(this Muhaqqiq m, int worksCount, Language language = Language.Ar) =>
        new(m.Id, m.Slug.Value, m.NameIn(language), m.BioIn(language), m.SpecialtiesIn(language),
            m.IsFeatured, worksCount, m.Name);

    public static AdminMuhaqqiqDto ToAdminDto(this Muhaqqiq m, int worksCount) =>
        new(m.Id, m.Slug.Value, m.Name, m.Bio, m.Specialties.ToList(), m.IsFeatured, m.DisplayOrder, m.IsActive, worksCount , m.TranslatedLanguages.Codes());
}