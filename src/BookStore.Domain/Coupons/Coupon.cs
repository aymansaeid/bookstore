using BookStore.Domain.Common;

namespace BookStore.Domain.Coupons;

public sealed class Coupon : AggregateRoot<int>
{
    public string Code { get; private set; } = string.Empty;
    public int DiscountPercentage { get; private set; }
    public DateTimeOffset ExpiresAtUtc { get; private set; }
    public int? MaxRedemptions { get; private set; } // null = unlimited
    public int TimesRedeemed { get; private set; }
    public bool IsActive { get; private set; }

    private Coupon() { } // EF Core

    private Coupon(string code, int discountPercentage, DateTimeOffset expiresAtUtc, int? maxRedemptions)
    {
        Code = code;
        DiscountPercentage = discountPercentage;
        ExpiresAtUtc = expiresAtUtc;
        MaxRedemptions = maxRedemptions;
        TimesRedeemed = 0;
        IsActive = true;
    }

    public static Coupon Create(string code, int discountPercentage, DateTimeOffset expiresAtUtc, int? maxRedemptions)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Coupon code is required.", nameof(code));
        if (discountPercentage is <= 0 or > 100)
            throw new ArgumentOutOfRangeException(nameof(discountPercentage), "Must be between 1 and 100.");
        if (expiresAtUtc <= DateTimeOffset.UtcNow)
            throw new ArgumentException("Expiry must be in the future.", nameof(expiresAtUtc));
        if (maxRedemptions is <= 0)
            throw new ArgumentOutOfRangeException(nameof(maxRedemptions), "Must be positive if specified.");

        return new Coupon(code.Trim().ToUpperInvariant(), discountPercentage, expiresAtUtc, maxRedemptions);
    }

    public Money CalculateDiscount(Money subtotal) => subtotal.PercentageOf(DiscountPercentage);

    /// In-memory guard used by the domain and by unit tests. The concurrency-safe
    /// enforcement at scale — same story as Book stock — is an atomic conditional
    /// UPDATE in ICouponRepository.TryRedeemAsync (WHERE TimesRedeemed < MaxRedemptions),
    /// so two guests racing for the last use of a limited coupon can't both win.
    public void ValidateForRedemption()
    {
        if (!IsActive)
            throw new CouponInactiveException(Code);
        if (DateTimeOffset.UtcNow > ExpiresAtUtc)
            throw new CouponExpiredException(Code, ExpiresAtUtc);
        if (MaxRedemptions.HasValue && TimesRedeemed >= MaxRedemptions.Value)
            throw new CouponUsageLimitReachedException(Code, MaxRedemptions.Value);
    }

    public void Redeem()
    {
        ValidateForRedemption();
        TimesRedeemed++;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;

    public void ExtendExpiry(DateTimeOffset newExpiresAtUtc)
    {
        if (newExpiresAtUtc <= DateTimeOffset.UtcNow)
            throw new ArgumentException("New expiry must be in the future.", nameof(newExpiresAtUtc));

        ExpiresAtUtc = newExpiresAtUtc;
    }
}