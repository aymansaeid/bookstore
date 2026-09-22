using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using BookStore.Domain.Common;

namespace BookStore.Domain.Books;

public sealed partial class Slug : ValueObject
{
    public string Value { get; }

    private Slug(string value) => Value = value;

    public static Slug Create(string value)
    {
        var normalized = Normalize(value);

        if (normalized.Length == 0)
            throw new ArgumentException("Slug cannot be empty after normalization.", nameof(value));

        return new Slug(normalized);
    }

    /// Turkish characters matter here: "Şiir Kitabı" has to become
    /// "siir-kitabi", not "iir-kitab". Decomposing to FormD splits accented
    /// letters into base + mark so the marks can be dropped, but ı, ş and ğ
    /// aren't decomposable, so they're mapped explicitly first.
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
            .Replace("ß", "ss").Replace("æ", "ae").Replace("ø", "o");

        var decomposed = mapped.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);

        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                builder.Append(c);
        }

        var ascii = builder.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();

        ascii = NonSlugCharacters().Replace(ascii, "-");
        ascii = MultipleDashes().Replace(ascii, "-").Trim('-');

        return ascii.Length > 200 ? ascii[..200].TrimEnd('-') : ascii;
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonSlugCharacters();

    [GeneratedRegex("-{2,}")]
    private static partial Regex MultipleDashes();

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;
}