using BookStore.Domain.Common;

namespace BookStore.Domain.Auth;

public sealed class RefreshToken : AggregateRoot<int>
{
    public int CustomerId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;

    /// Every token issued by refreshing another shares the original's
    /// family id. Reuse of a used token revokes the whole family at once.
    public Guid FamilyId { get; private set; }

    public DateTimeOffset ExpiresAtUtc { get; private set; }
    public DateTimeOffset? UsedAtUtc { get; private set; }
    public DateTimeOffset? RevokedAtUtc { get; private set; }
    public string? RevokedReason { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    public bool IsUsed => UsedAtUtc.HasValue;
    public bool IsRevoked => RevokedAtUtc.HasValue;
    public bool IsExpired => DateTimeOffset.UtcNow > ExpiresAtUtc;
    public bool IsUsable => !IsUsed && !IsRevoked && !IsExpired;

    private RefreshToken() { } // EF Core

    public static RefreshToken Create(int customerId, string tokenHash, Guid familyId, TimeSpan validFor) =>
        new()
        {
            CustomerId = customerId,
            TokenHash = tokenHash,
            FamilyId = familyId,
            ExpiresAtUtc = DateTimeOffset.UtcNow.Add(validFor),
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

    public void MarkUsed() => UsedAtUtc = DateTimeOffset.UtcNow;

    public void Revoke(string reason)
    {
        if (IsRevoked)
            return;

        RevokedAtUtc = DateTimeOffset.UtcNow;
        RevokedReason = reason;
    }
}