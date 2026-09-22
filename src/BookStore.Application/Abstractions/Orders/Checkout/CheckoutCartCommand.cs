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

public sealed record CheckoutCartCommand(
    string CustomerEmail,
    IReadOnlyCollection<CartLineDto> Lines,
    ShippingAddressDto ShippingAddress,
    string? CouponCode,
    string Currency,
    string SuccessUrl,
    string CancelUrl) : ICommand<CheckoutCartResponse>;

public sealed record CheckoutCartResponse(string OrderNumber, string CheckoutUrl);