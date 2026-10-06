using BookStore.Application.Abstractions.Messaging;

namespace BookStore.Application.Orders.Checkout;

public sealed record CartLineDto(int BookId, int Quantity);

public sealed record ShippingAddressDto(
    string RecipientName,
    string Phone,
    string Line1,
    string? Line2,
    string City,
    string? StateOrProvince,
    string PostalCode,
    string CountryCode);

/// CustomerId and ClientIp are set by the controller from the verified
/// token and the connection. They are never read from the request body.
public sealed record CheckoutCartCommand(
    string CustomerEmail,
    IReadOnlyCollection<CartLineDto> Lines,
    ShippingAddressDto? ShippingAddress,
    int? SavedAddressId,
    string? CouponCode,
    string AcceptedTermsVersion,
    string IdempotencyKey,
    int? CustomerId,
    string? ClientIp,
    string? ShippingMethod = null,
    bool GiftWrap = false,
    string? GiftMessage = null,
      string? Language = null) : ICommand<CheckoutCartResponse>;

public sealed record CheckoutCartResponse(string OrderNumber, string CheckoutUrl, DateTimeOffset ExpiresAtUtc);