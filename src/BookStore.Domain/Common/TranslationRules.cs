namespace BookStore.Domain.Common;

/// Shared rules for every translatable entity.
public static class TranslationRules
{
    public static void EnsureTranslatable(Language language)
    {
        if (!language.IsTranslatable())
            throw new ArgumentException(
                "Arabic is the source text and is edited on the item itself; translations are for en and tr.",
                nameof(language));
    }

    public static string Required(string? value, int maxLength, string field) =>
        Optional(value, maxLength, field) ?? throw new ArgumentException($"{field} is required.", field);

    public static string? Optional(string? value, int maxLength, string field)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
            throw new ArgumentException($"{field} can be at most {maxLength} characters.", field);

        return trimmed;
    }

    public static List<string> List(IEnumerable<string>? values, int maxItems, int maxLength, string field)
    {
        var cleaned = (values ?? [])
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (cleaned.Count > maxItems)
            throw new ArgumentException($"{field}: at most {maxItems} items.", field);
        if (cleaned.Any(v => v.Length > maxLength))
            throw new ArgumentException($"{field}: each item can be at most {maxLength} characters.", field);

        return cleaned;
    }

    /// Per-field fallback: a missing translated value falls back to the Arabic source.
    public static string? Prefer(string? translated, string? source) =>
        string.IsNullOrWhiteSpace(translated) ? source : translated;

    public static IReadOnlyList<string> Prefer(IReadOnlyCollection<string>? translated, IReadOnlyCollection<string> source) =>
        translated is { Count: > 0 } ? translated.ToList() : source.ToList();
}