using BookStore.Domain.Common;

namespace BookStore.Domain.Auth;

public enum SecurityTokenPurpose
{
    EmailVerification = 0,
    PasswordReset = 1
}

/// Single-use, expiring token for email flows. Only the SHA-256 hash is
/// stored: a database leak yields nothing usable.
public sealed class SecurityToken : AggregateRoot<int>
{
    public int CustomerId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public SecurityTokenPurpose Purpose { get; private set; }
    public DateTimeOffset ExpiresAtUtc { get; private set; }
    public DateTimeOffset? UsedAtUtc { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    public bool IsUsed => UsedAtUtc.HasValue;
    public bool IsExpired => DateTimeOffset.UtcNow > ExpiresAtUtc;
    public bool IsUsable => !IsUsed && !IsExpired;

    private SecurityToken() { } // EF Core

    public static SecurityToken Create(
        int customerId, string tokenHash, SecurityTokenPurpose purpose, TimeSpan validFor) =>
        new()
        {
            CustomerId = customerId,
            TokenHash = tokenHash,
            Purpose = purpose,
            ExpiresAtUtc = DateTimeOffset.UtcNow.Add(validFor),
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

    public void MarkUsed()
    {
        if (IsUsed)
            throw new InvalidOperationException("This token has already been used.");

        UsedAtUtc = DateTimeOffset.UtcNow;
    }
}