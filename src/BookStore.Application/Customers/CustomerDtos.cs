using BookStore.Domain.Customers;

namespace BookStore.Application.Customers;

public sealed record CustomerProfileDto(
    int Id, string Email, string FirstName, string LastName, string? Phone,
    bool IsEmailVerified, bool AcceptsMarketingEmails, DateTimeOffset CreatedAtUtc);

public sealed record CustomerAddressDto(
    int Id, string Label, string RecipientName, string Phone, string Line1, string? Line2,
    string City, string? StateOrProvince, string PostalCode, string CountryCode, bool IsDefault);

/// The refresh token is NOT here: it goes out as an HttpOnly cookie so
/// JavaScript (and any XSS) can't read it.
public sealed record CustomerAuthResponse(
    string AccessToken, DateTimeOffset ExpiresAtUtc, CustomerProfileDto Customer);

public static class CustomerMappings
{
    public static CustomerProfileDto ToProfileDto(this Customer c) =>
        new(c.Id, c.Email, c.FirstName, c.LastName, c.Phone,
            c.IsEmailVerified, c.AcceptsMarketingEmails, c.CreatedAtUtc);

    public static CustomerAddressDto ToDto(this CustomerAddress a) =>
        new(a.Id, a.Label, a.RecipientName, a.Phone, a.Line1, a.Line2,
            a.City, a.StateOrProvince, a.PostalCode, a.CountryCode, a.IsDefault);
}