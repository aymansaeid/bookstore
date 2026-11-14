using BookStore.Application.Common;
using BookStore.Domain.Common;

namespace BookStore.Application.Translations;

public static class TranslationErrors
{
    public static Error UnsupportedLanguage(string code) =>
        Error.Validation("Translation.UnsupportedLanguage",
            $"'{code}' is not a translation language. Use en or tr; Arabic is edited on the item itself.");

    public static Error NotFound(string entity, int id, string code) =>
        Error.NotFound("Translation.NotFound", $"{entity} {id} has no '{code}' translation.");

    public static Error Invalid(string message) => Error.Validation("Translation.Invalid", message);
}

public static class TranslationLanguage
{
    /// Route values like "en" / "tr"; Arabic and anything else are refused.
    public static Result<Language> Parse(string? code) =>
        Languages.TryParse(code, out var language) && language.IsTranslatable()
            ? Result.Success(language)
            : Result.Failure<Language>(TranslationErrors.UnsupportedLanguage(code ?? string.Empty));

    /// Translatable languages that have no translation yet.
    public static IReadOnlyList<string> Missing(IEnumerable<Language> present) =>
        Languages.Translatable.Except(present).Codes();
}