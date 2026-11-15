using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Common;
using BookStore.Domain.Legal;

namespace BookStore.Application.Legal;

public static class LegalLanguagePolicy
{
    /// Turkish buyers must accept Turkish texts (Mesafeli Satış Sözleşmesi,
    /// Ön Bilgilendirme Formu, KVKK Aydınlatma Metni): never a fallback.
    public static bool RequiresOwnLanguage(Language language) => language == Language.Tr;

    /// Languages to try, in order. English falls back to Arabic; Arabic and
    /// Turkish never fall back.
    public static IReadOnlyList<Language> Candidates(Language language) =>
        language == Language.Ar || RequiresOwnLanguage(language)
            ? [language]
            : [language, Languages.Default];
}

/// The published document a reader in `language` gets, by the policy above.
public sealed class LegalDocumentResolver(ILegalDocumentRepository repository)
{
    public async Task<LegalDocument?> ResolveAsync(LegalDocumentType type, Language language, CancellationToken ct)
    {
        foreach (var candidate in LegalLanguagePolicy.Candidates(language))
        {
            var document = await repository.GetPublishedAsync(type, candidate.Code(), ct);
            if (document is not null)
                return document;
        }

        return null;
    }
}

public static class CheckoutTerms
{
    /// The version the terms checkbox must send back, or a failure when this
    /// language has no fallback and its texts aren't published.
    public static Result<string> RequiredVersion(
        LegalDocument? contract, LegalDocument? preInformation, Language language, string configFallback)
    {
        if (LegalLanguagePolicy.RequiresOwnLanguage(language) && (contract is null || preInformation is null))
            return Result.Failure<string>(LegalErrors.TermsUnavailable(language.Code()));

        return Result.Success(contract?.Version ?? configFallback);
    }
}