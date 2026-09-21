using BookStore.Domain.Common;

namespace BookStore.Domain.Shipping;

public sealed class ShippingZone : AggregateRoot<int>
{
    public string Name { get; private set; } = string.Empty; // e.g. "Turkey", "European Union"
    public Money FlatRate { get; private set; } = null!;
    public bool IsActive { get; private set; }

    private readonly List<string> _countryCodes = [];
    public IReadOnlyCollection<string> CountryCodes => _countryCodes.AsReadOnly();

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
        _countryCodes.Remove(NormalizeCountryCode(countryCode));
        if (_countryCodes.Count == 0)
            throw new InvalidOperationException("Cannot remove the last country from a shipping zone.");
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
}