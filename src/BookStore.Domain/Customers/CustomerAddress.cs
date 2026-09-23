using BookStore.Domain.Common;
using BookStore.Domain.Orders;

namespace BookStore.Domain.Customers;

/// A saved address book entry. Deliberately NOT the Order.Address value
/// object: this one is mutable and labelled, while an order's address is an
/// immutable historical snapshot. ToOrderAddress() converts at checkout.
public sealed class CustomerAddress : Entity<int>
{
    public string Label { get; private set; } = string.Empty; // "Home", "Work"
    public string RecipientName { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string Line1 { get; private set; } = string.Empty;
    public string? Line2 { get; private set; }
    public string City { get; private set; } = string.Empty;
    public string? StateOrProvince { get; private set; }
    public string PostalCode { get; private set; } = string.Empty;
    public string CountryCode { get; private set; } = string.Empty;
    public bool IsDefault { get; private set; }

    private CustomerAddress() { } // EF Core

    internal static CustomerAddress Create(
        string label, string recipientName, string phone, string line1, string? line2,
        string city, string? stateOrProvince, string postalCode, string countryCode, bool isDefault)
    {
        var address = new CustomerAddress { IsDefault = isDefault };
        address.Update(label, recipientName, phone, line1, line2, city, stateOrProvince, postalCode, countryCode);
        return address;
    }

    internal void Update(
        string label, string recipientName, string phone, string line1, string? line2,
        string city, string? stateOrProvince, string postalCode, string countryCode)
    {
        if (string.IsNullOrWhiteSpace(label))
            throw new ArgumentException("Label is required.", nameof(label));

        // Reuse Order.Address's validation so a saved address can never be
        // in a state that checkout would later reject.
        _ = Address.Create(recipientName, phone, line1, line2, city, stateOrProvince, postalCode, countryCode);

        Label = label.Trim();
        RecipientName = recipientName.Trim();
        Phone = phone.Trim();
        Line1 = line1.Trim();
        Line2 = string.IsNullOrWhiteSpace(line2) ? null : line2.Trim();
        City = city.Trim();
        StateOrProvince = string.IsNullOrWhiteSpace(stateOrProvince) ? null : stateOrProvince.Trim();
        PostalCode = postalCode.Trim();
        CountryCode = countryCode.Trim().ToUpperInvariant();
    }

    internal void SetDefault(bool isDefault) => IsDefault = isDefault;

    public Address ToOrderAddress() =>
        Address.Create(RecipientName, Phone, Line1, Line2, City, StateOrProvince, PostalCode, CountryCode);
}