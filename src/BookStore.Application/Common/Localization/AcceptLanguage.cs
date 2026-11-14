using System.Globalization;
using BookStore.Domain.Common;

namespace BookStore.Application.Common.Localization;

public static class AcceptLanguage
{
    private const int MaxHeaderLength = 500;

    /// The highest-q supported language; equal q keeps header order.
    /// q=0 means "not acceptable". Nothing supported: Arabic.
    public static Language Resolve(string? header)
    {
        if (string.IsNullOrWhiteSpace(header))
            return Languages.Default;

        if (header.Length > MaxHeaderLength)
            header = header[..MaxHeaderLength];

        var best = header
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select((part, index) => Parse(part, index))
            .Where(x => x.Supported && x.Quality > 0)
            .OrderByDescending(x => x.Quality)
            .ThenBy(x => x.Index)
            .FirstOrDefault();

        return best.Supported ? best.Language : Languages.Default;
    }

    private static (bool Supported, Language Language, double Quality, int Index) Parse(string part, int index)
    {
        var pieces = part.Split(';', StringSplitOptions.TrimEntries);
        var quality = 1.0;

        foreach (var parameter in pieces.Skip(1))
        {
            if (parameter.StartsWith("q=", StringComparison.OrdinalIgnoreCase)
                && double.TryParse(parameter[2..], NumberStyles.Float, CultureInfo.InvariantCulture, out var q))
            {
                quality = Math.Clamp(q, 0, 1);
            }
        }

        return Languages.TryParse(pieces[0], out var language)
            ? (true, language, quality, index)
            : (false, Languages.Default, quality, index);
    }
}