using BookStore.Application.Common;
using BookStore.Domain.Common;
using BookStore.Domain.Coupons;
using BookStore.Domain.Shipping;

namespace BookStore.Application.Orders.Checkout;

public sealed record ShippingChoice(
    string Code, string? Name, string? Carrier, Money Price, bool IsFree,
    int? MinDays, int? MaxDays, bool IsPickup, bool IsRecommended)
{
    /// What gets snapshotted on the order and shown in emails.
    public string DisplayName => Name ?? Carrier ?? "Standard";
}

public sealed record FreeShippingProgress(decimal Threshold, decimal Remaining, bool Qualified);

/// The ONE place shipping and discount prices are decided. Used by both the
/// quote (cart page) and checkout (what is charged), so they can't drift.
public static class CheckoutPricing
{
    public const string StandardCode = "standard";
    public const string PickupCode = "pickup";

    public static Money Discount(Coupon? coupon, Money subtotal) =>
        coupon?.CalculateDiscount(subtotal) ?? Money.Zero(subtotal.Currency);

    /// merchandiseTotal = books after coupon, before shipping. That's what the
    /// free-shipping threshold is measured against.
    public static IReadOnlyList<ShippingChoice> ShippingOptions(
        ShippingZone? zone, Money merchandiseTotal, PickupSettings pickup, string? countryCode)
    {
        var currency = merchandiseTotal.Currency;
        var options = new List<ShippingChoice>();

        if (zone is not null)
        {
            var qualifies = zone.FreeShippingThreshold is { } threshold && merchandiseTotal.Amount >= threshold;
            var standardPrice = qualifies ? Money.Zero(currency) : zone.FlatRate;

            options.Add(new ShippingChoice(
                StandardCode, null, zone.StandardCarrier, standardPrice, standardPrice.Amount == 0,
                zone.StandardMinDays, zone.StandardMaxDays, IsPickup: false, IsRecommended: true));

            // Extras are never free, whatever the threshold.
            options.AddRange(zone.Options
                .OrderBy(o => o.DisplayOrder)
                .Select(o => new ShippingChoice(
                    o.Code, o.Name, o.Carrier, Money.From(o.Price, currency), o.Price == 0,
                    o.MinDays, o.MaxDays, IsPickup: false, IsRecommended: false)));
        }

        if (pickup.Enabled
            && countryCode is not null
            && string.Equals(countryCode, pickup.CountryCode, StringComparison.OrdinalIgnoreCase))
        {
            options.Add(new ShippingChoice(
                PickupCode, pickup.Name, null, Money.Zero(currency), IsFree: true,
                pickup.ReadyInDays, pickup.ReadyInDays, IsPickup: true, IsRecommended: false));
        }

        return options;
    }

    public static FreeShippingProgress? Progress(ShippingZone? zone, Money merchandiseTotal) =>
        zone?.FreeShippingThreshold is { } threshold
            ? new FreeShippingProgress(
                threshold,
                Math.Max(0m, threshold - merchandiseTotal.Amount),
                merchandiseTotal.Amount >= threshold)
            : null;
}