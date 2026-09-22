using BookStore.Domain.Coupons;

namespace BookStore.Application.Coupons;

public sealed record AdminCouponDto(
    int Id,
    string Code,
    int DiscountPercentage,
    DateTimeOffset ExpiresAtUtc,
    int? MaxRedemptions,
    int TimesRedeemed,
    int? RemainingRedemptions,
    bool IsActive,
    string Status);

// All the public ever learns: it works, and how much it takes off.
public sealed record CouponPreviewDto(string Code, int DiscountPercentage);

public static class CouponMappings
{
    public static AdminCouponDto ToAdminDto(this Coupon c) =>
        new(c.Id, c.Code, c.DiscountPercentage, c.ExpiresAtUtc, c.MaxRedemptions, c.TimesRedeemed,
            c.MaxRedemptions.HasValue ? c.MaxRedemptions.Value - c.TimesRedeemed : null,
            c.IsActive, GetStatus(c));

    // One human-readable answer to "why isn't this coupon working?"
    // Order matters: a switched-off coupon reads "Inactive" even if it's
    // also expired, because that's the thing the admin controls.
    private static string GetStatus(Coupon c)
    {
        if (!c.IsActive) return "Inactive";
        if (c.ExpiresAtUtc <= DateTimeOffset.UtcNow) return "Expired";
        if (c.MaxRedemptions.HasValue && c.TimesRedeemed >= c.MaxRedemptions.Value) return "Exhausted";
        return "Active";
    }
}