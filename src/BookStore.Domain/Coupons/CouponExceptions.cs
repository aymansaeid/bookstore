namespace BookStore.Domain.Coupons;

public sealed class CouponInactiveException(string code)
    : Exception($"Coupon '{code}' is not active.");

public sealed class CouponExpiredException(string code, DateTimeOffset expiresAtUtc)
    : Exception($"Coupon '{code}' expired on {expiresAtUtc:u}.");

public sealed class CouponUsageLimitReachedException(string code, int maxRedemptions)
    : Exception($"Coupon '{code}' has reached its usage limit of {maxRedemptions}.");