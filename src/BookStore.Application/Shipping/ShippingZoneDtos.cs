using System.Globalization;
using BookStore.Domain.Shipping;

namespace BookStore.Application.Shipping;

public sealed record AdminShippingZoneDto(
    int Id, string Name, decimal FlatRate, string Currency,
    IReadOnlyList<string> CountryCodes, bool IsActive,
    string? StandardCarrier, int? StandardMinDays, int? StandardMaxDays,
    decimal? FreeShippingThreshold, IReadOnlyList<ShippingOptionDto> Options);

// Flattened one row per country, which is exactly what a checkout country
// dropdown and a "shipping: $12" preview need.
public sealed record PublicShippingRateDto(
    string CountryCode, string CountryName, decimal FlatRate, string Currency,
    decimal? FreeShippingThreshold);

public sealed record ShippingOptionDto(
    string Code, string Name, string? Carrier, decimal Price, int? MinDays, int? MaxDays);

public static class ShippingZoneMappings
{
    public static AdminShippingZoneDto ToAdminDto(this ShippingZone z) =>
        new(z.Id, z.Name, z.FlatRate.Amount, z.FlatRate.Currency,
            z.CountryCodes.OrderBy(c => c).ToList(), z.IsActive,
            z.StandardCarrier, z.StandardMinDays, z.StandardMaxDays, z.FreeShippingThreshold,
            z.Options.OrderBy(o => o.DisplayOrder)
                .Select(o => new ShippingOptionDto(o.Code, o.Name, o.Carrier, o.Price, o.MinDays, o.MaxDays))
                .ToList());

    public static IEnumerable<PublicShippingRateDto> ToPublicRates(this ShippingZone z) =>
        z.CountryCodes.Select(code => new PublicShippingRateDto(
            code, CountryCodes.GetEnglishName(code), z.FlatRate.Amount, z.FlatRate.Currency, z.FreeShippingThreshold));
}

public static class CountryCodes
{
    public static bool IsValid(string? code)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Trim().Length != 2 || !code.Trim().All(char.IsAsciiLetter))
            return false;

        try
        {
            _ = new RegionInfo(code.Trim().ToUpperInvariant());
            return true;
        }
        catch (ArgumentException)
        {
            return false;
        }
    }

    public static string GetEnglishName(string code)
    {
        try { return new RegionInfo(code).EnglishName; }
        catch (ArgumentException) { return code; }
    }
}