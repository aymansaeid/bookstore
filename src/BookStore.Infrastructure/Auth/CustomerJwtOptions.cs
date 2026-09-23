namespace BookStore.Infrastructure.Auth;

public sealed class CustomerJwtOptions
{
    public const string SectionName = "CustomerJwt";

    public string Issuer { get; init; } = string.Empty;

    /// Deliberately different from the admin audience: a customer token
    /// fails validation on admin endpoints before roles are even read.
    public string Audience { get; init; } = string.Empty;

    public string SigningKey { get; init; } = string.Empty;
    public int ExpiryMinutes { get; init; } = 15;
}