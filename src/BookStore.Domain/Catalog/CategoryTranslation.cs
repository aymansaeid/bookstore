using BookStore.Domain.Common;

namespace BookStore.Domain.Catalog;

public sealed class CategoryTranslation
{
    public Language Language { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public DateTimeOffset UpdatedAtUtc { get; private set; }

    private CategoryTranslation() { } // EF Core

    internal static CategoryTranslation Create(Language language)
    {
        TranslationRules.EnsureTranslatable(language);
        return new CategoryTranslation { Language = language };
    }

    internal void Update(string name, string? description)
    {
        var cleanName = TranslationRules.Required(name, Category.MaxNameLength, "Name");
        var cleanDescription = TranslationRules.Optional(description, Category.MaxDescriptionLength, "Description");

        Name = cleanName;
        Description = cleanDescription;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }
}