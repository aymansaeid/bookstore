using BookStore.Domain.Common;

namespace BookStore.Application.Common;

/// Every link to the storefront goes through here, so the language prefix
/// ("" for Arabic, "/en", "/tr") is never forgotten.
public static class StorefrontLinks
{
    public static string For(StoreOptions store, Language language, string pathAndQuery)
    {
        var root = store.StorefrontBaseUrl.TrimEnd('/');
        var path = pathAndQuery.StartsWith('/') ? pathAndQuery : "/" + pathAndQuery;
        return root + language.UrlPrefix() + path;
    }

    public static string TrackOrder(StoreOptions store, Language language, string orderNumber) =>
        For(store, language, $"/track?order={Uri.EscapeDataString(orderNumber)}");

    public static string Book(StoreOptions store, Language language, string slug) =>
        For(store, language, $"/books/{Uri.EscapeDataString(slug)}");
}