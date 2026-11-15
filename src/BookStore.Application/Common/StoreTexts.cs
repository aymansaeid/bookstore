using BookStore.Domain.Common;

namespace BookStore.Application.Common;

/// Configured texts in a language, falling back to the Arabic value.
public static class StoreTexts
{
    public static string NameIn(this StoreOptions store, Language language) =>
        Pick(store.LocalizedNames, language) ?? store.Name;

    public static string? AnnouncementIn(this StoreOptions store, Language language) =>
        Pick(store.LocalizedAnnouncements, language)
        ?? (string.IsNullOrWhiteSpace(store.Announcement) ? null : store.Announcement.Trim());

    public static string NameIn(this PickupSettings pickup, Language language) =>
        Pick(pickup.LocalizedNames, language) ?? pickup.Name;

    private static string? Pick(IReadOnlyDictionary<string, string>? values, Language language)
    {
        if (values is null || !language.IsTranslatable())
            return null;

        var match = values.FirstOrDefault(kv => string.Equals(kv.Key, language.Code(), StringComparison.OrdinalIgnoreCase));
        return string.IsNullOrWhiteSpace(match.Value) ? null : match.Value.Trim();
    }
}