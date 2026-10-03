using System.Globalization;
using System.Text;

namespace BookStore.Domain.Common;

/// One normalisation shared by stored search text and incoming queries, so
/// every way of typing the same word matches.
public static class SearchNormalizer
{
    public const int MaxTokens = 6;

    /// - Arabic: harakat, tatweel removed; أ إ آ ٱ -> ا, ؤ -> و, ئ -> ي,
    ///   ى -> ي, ة -> ه; Arabic-Indic and Persian digits -> 0-9.
    /// - Latin/Turkish: accents removed (ş -> s, ğ -> g, İ -> i), lowercased.
    /// - Punctuation becomes a single space.
    public static string Normalize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        // FormD splits a letter from its marks: أ becomes ا + hamza mark,
        // ş becomes s + cedilla. Dropping every NonSpacingMark then removes
        // harakat, hamza marks and Latin accents in one pass.
        var decomposed = input.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        var lastWasSpace = true;

        foreach (var raw in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(raw) == UnicodeCategory.NonSpacingMark)
                continue;

            var c = Fold(raw);
            if (c == '\0')
                continue;

            if (char.IsLetterOrDigit(c))
            {
                builder.Append(char.ToLowerInvariant(c));
                lastWasSpace = false;
            }
            else if (!lastWasSpace)
            {
                builder.Append(' ');
                lastWasSpace = true;
            }
        }

        return builder.ToString().TrimEnd();
    }

    /// Splits a normalised query into at most six search words.
    public static IReadOnlyList<string> Tokenize(string normalized) =>
        normalized
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(StripArticle)
            .Where(token => token.Length >= 2)
            .Distinct(StringComparer.Ordinal)
            .Take(MaxTokens)
            .ToList();

    private static char Fold(char c) => c switch
    {
        '\u0640' => '\0',     // tatweel: decorative only
        '\u0671' => 'ا',      // alef wasla
        'ى' => 'ي',
        'ة' => 'ه',
        'ı' => 'i',
        >= '\u0660' and <= '\u0669' => (char)('0' + (c - '\u0660')), // ٠-٩
        >= '\u06F0' and <= '\u06F9' => (char)('0' + (c - '\u06F0')), // ۰-۹
        _ => c
    };

    /// Light stemming: "الحديث" also finds "حديث". Only when at least two
    /// letters remain, so "الم" stays intact.
    private static string StripArticle(string token) =>
        token.Length >= 4 && token.StartsWith("ال", StringComparison.Ordinal) ? token[2..] : token;
}