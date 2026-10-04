using BookStore.Domain.Common;
using System.Text.RegularExpressions;

namespace BookStore.Domain.Shipping;

public sealed partial class ShippingZone : AggregateRoot<int>
{
    public string Name { get; private set; } = string.Empty; // e.g. "Turkey", "European Union"
    public Money FlatRate { get; private set; } = null!;
    public bool IsActive { get; private set; }

    private readonly List<string> _countryCodes = [];
    public IReadOnlyCollection<string> CountryCodes => _countryCodes.AsReadOnly();

    public const int MaxOptions = 5;
    public const int MaxDeliveryDays = 60;

    /// Codes the system itself uses; zone extras can't take them.
    public static readonly IReadOnlySet<string> ReservedOptionCodes = new HashSet<string> { "standard", "pickup" };

    public string? StandardCarrier { get; private set; }
    public int? StandardMinDays { get; private set; }
    public int? StandardMaxDays { get; private set; }

    /// Standard delivery becomes free once the books total (after any coupon)
    /// reaches this amount. In the zone's currency. Null = never free.
    public decimal? FreeShippingThreshold { get; private set; }

    private readonly List<ShippingOption> _options = [];
    public IReadOnlyCollection<ShippingOption> Options => _options.AsReadOnly();

    private ShippingZone() { } // EF Core

    private ShippingZone(string name, Money flatRate, IEnumerable<string> countryCodes)
    {
        Name = name;
        FlatRate = flatRate;
        IsActive = true;
        _countryCodes.AddRange(countryCodes.Select(NormalizeCountryCode).Distinct());
    }

    public static ShippingZone Create(string name, Money flatRate, IEnumerable<string> countryCodes)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Zone name is required.", nameof(name));

        var codes = countryCodes.ToList();
        if (codes.Count == 0)
            throw new ArgumentException("A shipping zone needs at least one country.", nameof(countryCodes));

        return new ShippingZone(name.Trim(), flatRate, codes);
    }

    public void AddCountry(string countryCode)
    {
        var normalized = NormalizeCountryCode(countryCode);
        if (!_countryCodes.Contains(normalized))
            _countryCodes.Add(normalized);
    }

    public void RemoveCountry(string countryCode)
    {
        var normalized = NormalizeCountryCode(countryCode);

        // Check BEFORE mutating, so a failed call leaves the zone untouched.
        if (_countryCodes.Count == 1 && _countryCodes[0] == normalized)
            throw new InvalidOperationException("Cannot remove the last country from a shipping zone.");

        _countryCodes.Remove(normalized);
    }

    public void UpdateRate(Money newRate) => FlatRate = newRate;

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;

    private static string NormalizeCountryCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Trim().Length != 2)
            throw new ArgumentException("Country code must be a 2-letter ISO code.", nameof(code));

        return code.Trim().ToUpperInvariant();
    }
    public void Rename(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Zone name is required.", nameof(name));

        Name = name.Trim();
    }

    /// Full replacement of the country list, which is what an admin edit
    /// form actually does. Normalizes everything first, so an invalid code
    /// throws before the existing list is touched.
    public void ReplaceCountries(IEnumerable<string> countryCodes)
    {
        var normalized = countryCodes.Select(NormalizeCountryCode).Distinct().ToList();

        if (normalized.Count == 0)
            throw new ArgumentException("A shipping zone needs at least one country.", nameof(countryCodes));

        _countryCodes.Clear();
        _countryCodes.AddRange(normalized);
    }

    public void SetDeliveryDetails(
    string? standardCarrier,
    int? standardMinDays,
    int? standardMaxDays,
    decimal? freeShippingThreshold,
    IReadOnlyList<ShippingOptionInput> options)
    {
        ValidateDays(standardMinDays, standardMaxDays, "standard delivery");

        if (freeShippingThreshold is <= 0)
            throw new ArgumentOutOfRangeException(nameof(freeShippingThreshold), "The free-shipping threshold must be positive.");
        if (options.Count > MaxOptions)
            throw new ArgumentException($"A zone can have at most {MaxOptions} extra options.", nameof(options));

        var codes = options.Select(o => o.Code.Trim().ToLowerInvariant()).ToList();
        if (codes.Distinct().Count() != codes.Count)
            throw new ArgumentException("Each option code must be unique within the zone.", nameof(options));

        foreach (var option in options)
        {
            var code = option.Code.Trim().ToLowerInvariant();

            if (!OptionCodePattern().IsMatch(code))
                throw new ArgumentException($"Option code '{option.Code}' must be 2-30 characters of a-z, 0-9 or '-'.", nameof(options));
            if (ReservedOptionCodes.Contains(code))
                throw new ArgumentException($"'{code}' is reserved and can't be used for an extra option.", nameof(options));
            if (string.IsNullOrWhiteSpace(option.Name) || option.Name.Trim().Length > 100)
                throw new ArgumentException("Each option needs a name of at most 100 characters.", nameof(options));
            if (option.Price < 0)
                throw new ArgumentException("An option's price can't be negative.", nameof(options));

            ValidateDays(option.MinDays, option.MaxDays, $"option '{code}'");
        }

        StandardCarrier = string.IsNullOrWhiteSpace(standardCarrier) ? null : standardCarrier.Trim();
        StandardMinDays = standardMinDays;
        StandardMaxDays = standardMaxDays;
        FreeShippingThreshold = freeShippingThreshold;

        _options.Clear();
        for (var i = 0; i < options.Count; i++)
            _options.Add(ShippingOption.Create(options[i], i));
    }

    private static void ValidateDays(int? min, int? max, string what)
    {
        if (min is null && max is null)
            return;
        if (min is null || max is null)
            throw new ArgumentException($"Give both minimum and maximum days for {what}, or neither.");
        if (min < 0 || max > MaxDeliveryDays || min > max)
            throw new ArgumentException($"Delivery days for {what} must satisfy 0 <= min <= max <= {MaxDeliveryDays}.");
    }

    [GeneratedRegex("^[a-z0-9-]{2,30}$")]
    private static partial Regex OptionCodePattern();
}