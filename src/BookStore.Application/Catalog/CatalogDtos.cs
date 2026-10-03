using BookStore.Domain.Catalog;

namespace BookStore.Application.Catalog;

public sealed record CategoryRefDto(int Id, string Slug, string Name);

/// A book's category, with its parent for breadcrumbs («الحديث › شروح الحديث»).
public sealed record BookCategoryDto(int Id, string Slug, string Name, CategoryRefDto? Parent);

public sealed record MuhaqqiqRefDto(int Id, string Slug, string Name);

public sealed record PublicCategoryDto(
    int Id, string Slug, string Name, string? Letter, string? Description,
    int BookCount, CategoryRefDto? Parent, IReadOnlyList<PublicCategoryDto> Children);

public sealed record AdminCategoryDto(
    int Id, string Slug, string Name, string? Letter, string? Description,
    int? ParentId, int DisplayOrder, bool IsActive, int BookCount);

public sealed record PublicMuhaqqiqDto(
    int Id, string Slug, string Name, string? Bio, IReadOnlyList<string> Specialties,
    bool IsFeatured, int WorksCount);

public sealed record AdminMuhaqqiqDto(
    int Id, string Slug, string Name, string? Bio, IReadOnlyList<string> Specialties,
    bool IsFeatured, int DisplayOrder, bool IsActive, int WorksCount);

public static class CatalogMappings
{
    public static CategoryRefDto ToRef(this Category c) => new(c.Id, c.Slug.Value, c.Name);

    public static AdminCategoryDto ToAdminDto(this Category c, int bookCount) =>
        new(c.Id, c.Slug.Value, c.Name, c.Letter, c.Description, c.ParentId, c.DisplayOrder, c.IsActive, bookCount);

    public static PublicMuhaqqiqDto ToPublicDto(this Muhaqqiq m, int worksCount) =>
        new(m.Id, m.Slug.Value, m.Name, m.Bio, m.Specialties.ToList(), m.IsFeatured, worksCount);

    public static AdminMuhaqqiqDto ToAdminDto(this Muhaqqiq m, int worksCount) =>
        new(m.Id, m.Slug.Value, m.Name, m.Bio, m.Specialties.ToList(), m.IsFeatured, m.DisplayOrder, m.IsActive, worksCount);
}