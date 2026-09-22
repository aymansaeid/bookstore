namespace BookStore.Infrastructure.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; init; } = string.Empty;
    public string Audience { get; init; } = string.Empty;

    // Lives in user secrets locally and in environment config in
    // production, never in appsettings.json or git.
    public string SigningKey { get; init; } = string.Empty;

    public int ExpiryMinutes { get; init; } = 60;
}