using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using BookStore.Domain.Common;

namespace BookStore.Domain.Books;

public sealed partial class Slug : ValueObject
{
    public const int MaxLength = 200;

    public string Value { get; }

    private Slug(string value) => Value = value;

    public static Slug Create(string value)
    {
        var normalized = Normalize(value);

        if (normalized.Length == 0)
            throw new ArgumentException("Slug cannot be empty after normalization.", nameof(value));

        return new Slug(normalized);
    }

    /// Latin text is transliterated to ASCII ("Şiir Kitabı" -> "siir-kitabi").
    /// Arabic letters are kept as Arabic, so Arabic titles get readable URLs
    /// ("زَادُ المَعَاد" -> "زاد-المعاد").
    ///
    /// Decomposing to FormD and dropping non-spacing marks removes Latin
    /// accents AND Arabic harakat in one pass. It also folds hamza forms
    /// (أ إ آ -> ا, ؤ -> و, ئ -> ي), which is the usual normalisation for
    /// Arabic search and URLs: the same title always yields the same slug,
    /// however it was typed.
    private static string Normalize(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        var mapped = input
            .Replace("ı", "i").Replace("İ", "I")
            .Replace("ş", "s").Replace("Ş", "S")
            .Replace("ğ", "g").Replace("Ğ", "G")
            .Replace("ç", "c").Replace("Ç", "C")
            .Replace("ö", "o").Replace("Ö", "O")
            .Replace("ü", "u").Replace("Ü", "U")
            .Replace("ß", "ss").Replace("æ", "ae").Replace("ø", "o")
            .Replace("\u0640", string.Empty); // tatweel: purely decorative stretching

        var decomposed = mapped.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);

        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                builder.Append(c);
        }

        var slug = builder.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();

        slug = NonSlugCharacters().Replace(slug, "-");
        slug = MultipleDashes().Replace(slug, "-").Trim('-');

        return slug.Length > MaxLength ? slug[..MaxLength].TrimEnd('-') : slug;
    }

    // Allowed: a-z, 0-9, Arabic letters (U+0621-U+064A), Arabic-Indic
    // digits (U+0660-U+0669) and extended Arabic letters (U+0671-U+06D3).
    // Arabic punctuation such as the comma "،" is deliberately excluded.
    [GeneratedRegex("[^a-z0-9\u0621-\u064A\u0660-\u0669\u0671-\u06D3]+")]
    private static partial Regex NonSlugCharacters();

    [GeneratedRegex("-{2,}")]
    private static partial Regex MultipleDashes();

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;
}