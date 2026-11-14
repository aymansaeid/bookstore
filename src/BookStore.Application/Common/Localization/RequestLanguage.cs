using BookStore.Domain.Common;

namespace BookStore.Application.Common.Localization;

public static class RequestLanguage
{
    /// Admin endpoints are always Arabic: the admin panel is Arabic-only and a
    /// browser default ("en-US") must not turn admin search results English.
    public static Language Resolve(string? path, string? acceptLanguage) =>
        IsAdminPath(path) ? Languages.Default : AcceptLanguage.Resolve(acceptLanguage);

    public static bool IsAdminPath(string? path) =>
        path is not null
        && (path.Equals("/api/admin", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/admin/", StringComparison.OrdinalIgnoreCase));
}