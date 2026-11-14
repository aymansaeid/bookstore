namespace BookStore.Domain.Common;

/// Store languages. Arabic is the source language of all content.
public enum Language
{
    Ar = 0,
    En = 1,
    Tr = 2
}

public static class Languages
{
    public const Language Default = Language.Ar;

    public static readonly IReadOnlyList<Language> All = [Language.Ar, Language.En, Language.Tr];

    /// Arabic lives on the entity itself; only these get translation rows.
    public static readonly IReadOnlyList<Language> Translatable = [Language.En, Language.Tr];

    public static string Code(this Language language) => language switch
    {
        Language.En => "en",
        Language.Tr => "tr",
        _ => "ar"
    };

    public static IReadOnlyList<string> Codes(this IEnumerable<Language> languages) =>
        languages.Select(Code).ToList();

    /// "en", "EN", "en-US", "tr_TR" all parse. Anything else: false.
    public static bool TryParse(string? value, out Language language)
    {
        language = Default;
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var primary = value.Trim().Split('-', '_')[0].ToLowerInvariant();
        switch (primary)
        {
            case "ar": language = Language.Ar; return true;
            case "en": language = Language.En; return true;
            case "tr": language = Language.Tr; return true;
            default: return false;
        }
    }

    public static Language ParseOrDefault(string? value) => TryParse(value, out var language) ? language : Default;

    public static bool IsTranslatable(this Language language) => language != Language.Ar;

    public static bool IsRightToLeft(this Language language) => language == Language.Ar;

    /// Storefront URL prefix: "" for Arabic, "/en", "/tr".
    public static string UrlPrefix(this Language language) =>
        language.IsTranslatable() ? "/" + language.Code() : string.Empty;
}