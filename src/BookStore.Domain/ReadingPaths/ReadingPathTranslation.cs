using BookStore.Domain.Common;

namespace BookStore.Domain.ReadingPaths;

public sealed record StageReasonInput(int BookId, string Reason);

public sealed class ReadingPathTranslation
{
    public Language Language { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public DateTimeOffset UpdatedAtUtc { get; private set; }

    private ReadingPathTranslation() { } // EF Core

    internal static ReadingPathTranslation Create(Language language)
    {
        TranslationRules.EnsureTranslatable(language);
        return new ReadingPathTranslation { Language = language };
    }

    internal void Update(string title, string? description)
    {
        var cleanTitle = TranslationRules.Required(title, ReadingPath.MaxTitleLength, "Title");
        var cleanDescription = TranslationRules.Optional(description, ReadingPath.MaxDescriptionLength, "Description");

        Title = cleanTitle;
        Description = cleanDescription;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }
}

/// «لماذا هذا الكتاب» in one language, keyed by BOOK rather than stage
/// number, so reordering stages keeps every translation.
public sealed class ReadingPathStageTranslation
{
    public int BookId { get; private set; }
    public Language Language { get; private set; }
    public string Reason { get; private set; } = string.Empty;

    private ReadingPathStageTranslation() { } // EF Core

    internal static ReadingPathStageTranslation Create(int bookId, Language language, string reason) =>
        new() { BookId = bookId, Language = language, Reason = reason };

    internal void Update(string reason) => Reason = reason;
}