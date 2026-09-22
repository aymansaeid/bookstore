using BookStore.Application.Common;

namespace BookStore.Application.Coupons;

public static class CouponErrors
{
    public static Error NotFound(int id) =>
        Error.NotFound("Coupon.NotFound", $"Coupon {id} was not found.");

    public static Error DuplicateCode(string code) =>
        Error.Conflict("Coupon.DuplicateCode", $"A coupon with code '{code}' already exists.");

    public static Error MaxBelowRedeemed(int timesRedeemed) =>
        Error.Conflict("Coupon.MaxBelowRedeemed",
            $"The usage limit can't be lower than {timesRedeemed}, the number of times it's already been used.");

    public static Error CannotDeleteUsed(int timesRedeemed) =>
        Error.Conflict("Coupon.CannotDeleteUsed",
            $"This coupon has been used {timesRedeemed} time(s) and is kept for reporting. Deactivate it instead.");

    // Deliberately vague: never tell the public WHY a code failed.
    public static Error Invalid =>
        Error.Validation("Coupon.Invalid", "This coupon code is not valid.");
}