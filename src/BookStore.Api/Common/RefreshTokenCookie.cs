namespace BookStore.Api.Common;

public static class RefreshTokenCookie
{
    public const string Name = "bookstore_rt";

    public static void Set(HttpResponse response, string token, DateTimeOffset expiresAt, IWebHostEnvironment env)
    {
        response.Cookies.Append(Name, token, new CookieOptions
        {
            // JavaScript can never read this, so XSS can't steal the
            // long-lived credential.
            HttpOnly = true,
            Secure = true,
            // Lax, not Strict: the storefront and API are different origins
            // in development, and Strict breaks the flow after email links.
            SameSite = SameSiteMode.Lax,
            Expires = expiresAt,
            // Scoped to the refresh endpoints so it isn't sent with every
            // ordinary API call.
            Path = "/api/customers/auth"
        });
    }

    public static void Clear(HttpResponse response) =>
        response.Cookies.Delete(Name, new CookieOptions { Path = "/api/customers/auth" });
}