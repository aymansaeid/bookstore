using BookStore.Domain.Common;

namespace BookStore.Domain.Orders;

public sealed class Address : ValueObject
{
    public string RecipientName { get; }
    public string Phone { get; }
    public string Line1 { get; }
    public string? Line2 { get; }
    public string City { get; }
    public string? StateOrProvince { get; }
    public string PostalCode { get; }
    public string CountryCode { get; }

    private Address(string recipientName, string phone, string line1, string? line2, string city,
        string? stateOrProvince, string postalCode, string countryCode)
    {
        RecipientName = recipientName;
        Phone = phone;
        Line1 = line1;
        Line2 = line2;
        City = city;
        StateOrProvince = stateOrProvince;
        PostalCode = postalCode;
        CountryCode = countryCode;
    }

    public static Address Create(string recipientName, string phone, string line1, string? line2, string city,
        string? stateOrProvince, string postalCode, string countryCode)
    {
        if (string.IsNullOrWhiteSpace(recipientName))
            throw new ArgumentException("Recipient name is required.", nameof(recipientName));
        if (string.IsNullOrWhiteSpace(phone))
            throw new ArgumentException("A contact phone number is required for delivery.", nameof(phone));
        if (string.IsNullOrWhiteSpace(line1))
            throw new ArgumentException("Address line 1 is required.", nameof(line1));
        if (string.IsNullOrWhiteSpace(city))
            throw new ArgumentException("City is required.", nameof(city));
        if (string.IsNullOrWhiteSpace(postalCode))
            throw new ArgumentException("Postal code is required.", nameof(postalCode));
        if (string.IsNullOrWhiteSpace(countryCode) || countryCode.Length != 2)
            throw new ArgumentException("Country code must be a 2-letter ISO code.", nameof(countryCode));

        return new Address(recipientName.Trim(), phone.Trim(), line1.Trim(), line2?.Trim(), city.Trim(),
            stateOrProvince?.Trim(), postalCode.Trim(), countryCode.ToUpperInvariant());
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return RecipientName;
        yield return Phone;
        yield return Line1;
        yield return Line2;
        yield return City;
        yield return StateOrProvince;
        yield return PostalCode;
        yield return CountryCode;
    }
}