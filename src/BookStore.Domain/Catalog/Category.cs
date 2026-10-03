using System.Globalization;
using BookStore.Domain.Books;
using BookStore.Domain.Common;

namespace BookStore.Domain.Catalog;

public sealed class Category : AggregateRoot<int>
{
    public const int MaxNameLength = 100;
    public const int MaxDescriptionLength = 500;

    public string Name { get; private set; } = string.Empty;

    /// Permanent once created: category URLs must not break.
    public Slug Slug { get; private set; } = null!;

    /// The large decorative Ruqʿa letter behind the home-page tile
    /// (spec 5.1, item 6). Meaningful for top-level categories.
    public string? Letter { get; private set; }

    public string? Description { get; private set; }
    public int? ParentId { get; private set; }
    public int DisplayOrder { get; private set; }
    public bool IsActive { get; private set; }

    public bool IsTopLevel => ParentId is null;

    private Category() { } // EF Core

    public static Category Create(
        string name, Slug slug, string? letter, string? description, int? parentId, int displayOrder)
    {
        var category = new Category { Slug = slug, ParentId = parentId, IsActive = true };
        category.Update(name, letter, description, displayOrder);
        return category;
    }

    public void Update(string name, string? letter, string? description, int displayOrder)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Category name is required.", nameof(name));
        if (name.Trim().Length > MaxNameLength)
            throw new ArgumentException($"Category name can be at most {MaxNameLength} characters.", nameof(name));

        var trimmedDescription = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        if (trimmedDescription is { Length: > MaxDescriptionLength })
            throw new ArgumentException($"Description can be at most {MaxDescriptionLength} characters.", nameof(description));

        Name = name.Trim();
        Letter = NormalizeLetter(letter);
        Description = trimmedDescription;
        DisplayOrder = displayOrder;
    }

    /// The rules that need OTHER categories (the parent must be top-level; a
    /// category with children can't become a child) are checked by the
    /// application layer, which can see them. This guards the one cycle a
    /// category can detect on its own.
    public void MoveUnder(int? parentId)
    {
        if (parentId is not null && parentId == Id)
            throw new InvalidOperationException("A category can't be its own parent.");

        ParentId = parentId;
    }

    public void Activate() => IsActive = true;
    public void Deactivate() => IsActive = false;

    private static string? NormalizeLetter(string? letter)
    {
        if (string.IsNullOrWhiteSpace(letter))
            return null;

        var trimmed = letter.Trim();

        // Counted in text elements, not chars: a letter typed with a
        // diacritic is still one visible letter.
        if (new StringInfo(trimmed).LengthInTextElements != 1)
            throw new ArgumentException("The decorative letter must be a single character.", nameof(letter));

        return trimmed;
    }
}