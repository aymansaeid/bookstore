using System.Text.RegularExpressions;
using BookStore.Domain.Common;

namespace BookStore.Domain.Legal;

public enum LegalDocumentType
{
    DistanceSalesContract = 0,   // Mesafeli Satış Sözleşmesi
    PreInformationForm = 1,      // Ön Bilgilendirme Formu
    PrivacyNotice = 2,           // KVKK Aydınlatma Metni
    TermsOfUse = 3
}

public enum LegalDocumentStatus
{
    Draft = 0,
    Published = 1,
    Archived = 2
}

public static class LegalLanguages
{
    public static readonly IReadOnlySet<string> Supported = new HashSet<string> { "ar", "tr", "en" };
    public const string Default = "ar";

    public static string Normalize(string? language)
    {
        var lower = language?.Trim().ToLowerInvariant();
        return lower is not null && Supported.Contains(lower) ? lower : Default;
    }
}

public sealed partial class LegalDocument : AggregateRoot<int>
{
    public const int MaxTitleLength = 200;
    public const int MaxBodyLength = 100_000;

    public LegalDocumentType Type { get; private set; }
    public string Language { get; private set; } = LegalLanguages.Default;

    /// Free-form but stable, e.g. "2026-10". It's what the checkout
    /// checkbox accepts, so keep it short and readable.
    public string Version { get; private set; } = string.Empty;

    public string Title { get; private set; } = string.Empty;
    public string BodyMarkdown { get; private set; } = string.Empty;

    public LegalDocumentStatus Status { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? PublishedAtUtc { get; private set; }
    public DateTimeOffset? ArchivedAtUtc { get; private set; }

    private LegalDocument() { } // EF Core

    public static LegalDocument CreateDraft(
        LegalDocumentType type, string language, string version, string title, string bodyMarkdown)
    {
        if (!LegalLanguages.Supported.Contains(language))
            throw new ArgumentException($"Language must be one of: {string.Join(", ", LegalLanguages.Supported)}.", nameof(language));
        if (string.IsNullOrWhiteSpace(version) || !VersionPattern().IsMatch(version.Trim()))
            throw new ArgumentException("Version must be 1-50 characters of letters, digits, '.', '-' or '_'.", nameof(version));

        var document = new LegalDocument
        {
            Type = type,
            Language = language,
            Version = version.Trim(),
            Status = LegalDocumentStatus.Draft,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        document.EditDraft(title, bodyMarkdown);
        return document;
    }

    /// Published text is frozen: what a customer accepted must stay exactly
    /// reproducible. A change means a new version.
    public void EditDraft(string title, string bodyMarkdown)
    {
        if (Status != LegalDocumentStatus.Draft)
            throw new InvalidOperationException(
                "Published or archived versions can't be edited. Create a new version instead.");
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > MaxTitleLength)
            throw new ArgumentException($"Title is required, at most {MaxTitleLength} characters.", nameof(title));
        if (string.IsNullOrWhiteSpace(bodyMarkdown) || bodyMarkdown.Length > MaxBodyLength)
            throw new ArgumentException($"Body is required, at most {MaxBodyLength} characters.", nameof(bodyMarkdown));

        Title = title.Trim();
        BodyMarkdown = bodyMarkdown;
    }

    public void Publish()
    {
        if (Status != LegalDocumentStatus.Draft)
            throw new InvalidOperationException("Only a draft can be published.");

        Status = LegalDocumentStatus.Published;
        PublishedAtUtc = DateTimeOffset.UtcNow;
    }

    public void Archive()
    {
        if (Status != LegalDocumentStatus.Published)
            throw new InvalidOperationException("Only the published version can be archived.");

        Status = LegalDocumentStatus.Archived;
        ArchivedAtUtc = DateTimeOffset.UtcNow;
    }

    [GeneratedRegex("^[A-Za-z0-9._-]{1,50}$")]
    private static partial Regex VersionPattern();
}