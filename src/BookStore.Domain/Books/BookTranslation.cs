using BookStore.Domain.Common;

namespace BookStore.Domain.Books;

public sealed record BookTranslationInput(
    string Title, string? Subtitle, string? Author, string? Description, string? EditionLabel,
    IReadOnlyList<string>? Highlights);

/// A book's text in one non-Arabic language. Every field except the title is
/// optional and falls back to Arabic on its own. Owned by Book.
public sealed class BookTranslation
{
    // Same limits as the Arabic columns.
    public const int MaxTitleLength = 500;
    public const int MaxSubtitleLength = 500;
    public const int MaxAuthorLength = 300;
    public const int MaxDescriptionLength = 4000;

    public Language Language { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Subtitle { get; private set; }
    public string? Author { get; private set; }
    public string? Description { get; private set; }
    public string? EditionLabel { get; private set; }

    private readonly List<string> _highlights = [];
    public IReadOnlyCollection<string> Highlights => _highlights.AsReadOnly();

    public DateTimeOffset UpdatedAtUtc { get; private set; }

    private BookTranslation() { } // EF Core

    internal static BookTranslation Create(Language language)
    {
        TranslationRules.EnsureTranslatable(language);
        return new BookTranslation { Language = language };
    }

    internal void Update(BookTranslationInput input)
    {
        // Validate everything first: a bad field never leaves a half-updated row.
        var title = TranslationRules.Required(input.Title, MaxTitleLength, "Title");
        var subtitle = TranslationRules.Optional(input.Subtitle, MaxSubtitleLength, "Subtitle");
        var author = TranslationRules.Optional(input.Author, MaxAuthorLength, "Author");
        var description = TranslationRules.Optional(input.Description, MaxDescriptionLength, "Description");
        var editionLabel = TranslationRules.Optional(input.EditionLabel, Book.MaxEditionLabelLength, "EditionLabel");
        var highlights = TranslationRules.List(input.Highlights, Book.MaxHighlights, Book.MaxHighlightLength, "Highlights");

        Title = title;
        Subtitle = subtitle;
        Author = author;
        Description = description;
        EditionLabel = editionLabel;
        _highlights.Clear();
        _highlights.AddRange(highlights);
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }
}

/// A book's text in one language, each field already falling back to Arabic.
public sealed record BookText(
    string Title, string? Subtitle, string Author, string Description, string? EditionLabel,
    IReadOnlyList<string> Highlights);