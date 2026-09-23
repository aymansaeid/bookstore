using BookStore.Application.Common;

namespace BookStore.Application.Orders.Checkout;

public static class CheckoutErrors
{
    public static Error EmptyCart =>
        Error.Validation("Checkout.EmptyCart", "Cart cannot be empty.");
    public static Error BookNotFound(int bookId) =>
        Error.NotFound("Checkout.BookNotFound", $"Book {bookId} was not found.");
    public static Error InsufficientStock(int bookId) =>
        Error.Conflict("Checkout.InsufficientStock", $"Book {bookId} does not have enough stock available.");
    public static Error ShippingZoneNotFound(string countryCode) =>
        Error.Validation("Checkout.ShippingZoneNotSupported", $"We currently don't ship to '{countryCode}'.");
    public static Error CouponInvalid(string code) =>
        Error.Validation("Checkout.CouponInvalid", $"Coupon '{code}' is not valid.");
    public static Error PaymentGatewayFailure =>
        Error.Failure("Checkout.PaymentGatewayFailure", "Could not start payment. Please try again.");
    public static Error CustomerNotFound =>
    Error.Unauthorized("Checkout.CustomerNotFound", "Your session is no longer valid. Please sign in again.");
    public static Error SavedAddressNotFound =>
        Error.NotFound("Checkout.SavedAddressNotFound", "That saved address was not found.");
}