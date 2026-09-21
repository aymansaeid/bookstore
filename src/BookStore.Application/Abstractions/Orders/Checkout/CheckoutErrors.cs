using BookStore.Application.Common;

namespace BookStore.Application.Orders.Checkout;

public static class CheckoutErrors
{
    public static Error EmptyCart => new("Checkout.EmptyCart", "Cart cannot be empty.");
    public static Error BookNotFound(int bookId) =>
        new("Checkout.BookNotFound", $"Book {bookId} was not found.");
    public static Error InsufficientStock(int bookId) =>
        new("Checkout.InsufficientStock", $"Book {bookId} does not have enough stock available.");
    public static Error ShippingZoneNotFound(string countryCode) =>
        new("Checkout.ShippingZoneNotSupported", $"We currently don't ship to '{countryCode}'.");
    public static Error CouponInvalid(string code) =>
        new("Checkout.CouponInvalid", $"Coupon '{code}' is not valid.");
    public static Error PaymentGatewayFailure =>
        new("Checkout.PaymentGatewayFailure", "Could not start payment. Please try again.");
}