using BookStore.Application.Common;

namespace BookStore.Application.Catalog;

public static class CatalogErrors
{
    public static Error InvalidSlug =>
        Error.Validation("Catalog.InvalidSlug", "The name or slug contains no usable URL characters.");

    public static Error CategoryNotFound(int id) =>
        Error.NotFound("Category.NotFound", $"Category {id} was not found.");

    public static Error CategorySlugNotFound(string slug) =>
        Error.NotFound("Category.SlugNotFound", $"No category found at '{slug}'.");

    public static Error DuplicateCategorySlug(string slug) =>
        Error.Conflict("Category.DuplicateSlug", $"A category with the URL '{slug}' already exists.");

    public static Error ParentMustBeTopLevel =>
        Error.Validation("Category.ParentMustBeTopLevel",
            "Categories have two levels: the parent must be a top-level category.");

    public static Error CannotBeOwnParent =>
        Error.Validation("Category.CannotBeOwnParent", "A category can't be its own parent.");

    public static Error HasSubcategories =>
        Error.Conflict("Category.HasSubcategories",
            "This category has subcategories. Move or delete them first.");

    public static Error CategoryInUse(int bookCount) =>
        Error.Conflict("Category.InUse",
            $"{bookCount} book(s) use this category. Reassign them, or hide the category instead.");

    public static Error MuhaqqiqNotFound(int id) =>
        Error.NotFound("Muhaqqiq.NotFound", $"Muhaqqiq {id} was not found.");

    public static Error MuhaqqiqSlugNotFound(string slug) =>
        Error.NotFound("Muhaqqiq.SlugNotFound", $"No muhaqqiq found at '{slug}'.");

    public static Error DuplicateMuhaqqiqSlug(string slug) =>
        Error.Conflict("Muhaqqiq.DuplicateSlug", $"A muhaqqiq with the URL '{slug}' already exists.");

    public static Error MuhaqqiqInUse(int bookCount) =>
        Error.Conflict("Muhaqqiq.InUse",
            $"{bookCount} book(s) credit this muhaqqiq. Remove them from those books, or hide the profile instead.");

    public static Error UnknownMuhaqqiqs(IEnumerable<int> ids) =>
        Error.Validation("Book.UnknownMuhaqqiqs", $"Unknown muhaqqiq id(s): {string.Join(", ", ids)}.");
}