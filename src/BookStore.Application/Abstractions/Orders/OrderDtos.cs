using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Books;
using BookStore.Domain.Books;
using BookStore.Domain.Orders;

namespace BookStore.Application.Orders;

public sealed record AdminOrderSummaryDto(
    int Id,
    string OrderNumber,
    string CustomerEmail,
    string RecipientName,
    string CountryCode,
    OrderStatus Status,
    int ItemCount,
    decimal Total,
    string Currency,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? PaidAtUtc,
    DateTimeOffset? ShippedAtUtc);

public sealed record OrderLineDto(int BookId, string Title, int Quantity, decimal UnitPrice, decimal LineTotal);

public sealed record AddressDto(
    string RecipientName, string Phone, string Line1, string? Line2, string City,
    string? StateOrProvince, string PostalCode, string CountryCode);

public sealed record AdminOrderDetailsDto(
    int Id,
    string OrderNumber,
    string CustomerEmail,
    OrderStatus Status,
    AddressDto ShippingAddress,
    IReadOnlyList<OrderLineDto> Lines,
    decimal Subtotal,
    decimal ShippingCost,
    decimal DiscountAmount,
    decimal Total,
    string Currency,
    string? AppliedCouponCode,
    string? ShippingCarrier,
    string? TrackingNumber,
    string? CancellationReason,
    string? CheckoutSessionId,
    string? PaymentReference,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? PaidAtUtc,
    DateTimeOffset? ShippedAtUtc,
    DateTimeOffset? DeliveredAtUtc,
    DateTimeOffset? CancelledAtUtc,
    IReadOnlyList<string> AllowedActions,
    string ShippingMethodCode, string? ShippingMethodName,
    bool GiftWrap, decimal GiftWrapFee, string? GiftMessage);

public sealed record PublicOrderLineDto(
    string Title, int Quantity, decimal UnitPrice, decimal LineTotal,
    int BookId, string? BookSlug, string? CoverImageUrl);
public sealed record PublicOrderDto(
    string OrderNumber,
    OrderStatus Status,
    IReadOnlyList<PublicOrderLineDto> Lines,
    decimal Subtotal,
    decimal ShippingCost,
    decimal DiscountAmount,
    decimal Total,
    string Currency,
    string ShipToCity,
    string ShipToCountryCode,
    string? ShippingCarrier,
    string? TrackingNumber,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? ShippedAtUtc,
    DateTimeOffset? DeliveredAtUtc,
    string ShippingMethodCode, string? ShippingMethodName, bool GiftWrap, decimal GiftWrapFee);

public static class OrderMappings
{
    public static AdminOrderDetailsDto ToAdminDetailsDto(this Order o) =>
        new(o.Id, o.OrderNumber, o.CustomerEmail, o.Status,
            new AddressDto(o.ShippingAddress.RecipientName, o.ShippingAddress.Phone, o.ShippingAddress.Line1, o.ShippingAddress.Line2,
                o.ShippingAddress.City, o.ShippingAddress.StateOrProvince, o.ShippingAddress.PostalCode,
                o.ShippingAddress.CountryCode),
            o.Lines.Select(l => new OrderLineDto(
                l.BookId, l.BookTitleSnapshot, l.Quantity, l.UnitPriceAtPurchase.Amount, l.LineTotal.Amount)).ToList(),
            o.Subtotal.Amount, o.ShippingCost.Amount, o.DiscountAmount.Amount, o.Total.Amount, o.Total.Currency,
            o.AppliedCouponCode, o.ShippingCarrier, o.TrackingNumber, o.CancellationReason,
            o.CheckoutSessionId, o.PaymentReference,
            o.CreatedAtUtc, o.PaidAtUtc, o.ShippedAtUtc, o.DeliveredAtUtc, o.CancelledAtUtc,
            GetAllowedActions(o), o.ShippingMethodCode, o.ShippingMethodName, o.GiftWrap, o.GiftWrapFee.Amount, o.GiftMessage);

    /// books: the purchased books, for slugs and covers. Optional: a line whose
    /// book can't be found still renders, just without a link or cover. The
    /// title is always the one snapshotted at purchase.
    public static PublicOrderDto ToPublicDto(
        this Order o, IReadOnlyDictionary<int, Book>? books = null, IFileStorage? storage = null) =>
        new(o.OrderNumber, o.Status,
            o.Lines.Select(l =>
            {
                Book? book = null;
                books?.TryGetValue(l.BookId, out book);

                return new PublicOrderLineDto(
                    l.BookTitleSnapshot, l.Quantity, l.UnitPriceAtPurchase.Amount, l.LineTotal.Amount,
                    l.BookId,
                    book?.Slug.Value,
                    book is not null && storage is not null ? BookMappings.CoverUrl(book, storage) : null);
            }).ToList(),
            o.Subtotal.Amount, o.ShippingCost.Amount, o.DiscountAmount.Amount, o.Total.Amount, o.Total.Currency,
            o.ShippingAddress.City, o.ShippingAddress.CountryCode,
            o.ShippingCarrier, o.TrackingNumber,
            o.CreatedAtUtc, o.ShippedAtUtc, o.DeliveredAtUtc,
            o.ShippingMethodCode, o.ShippingMethodName, o.GiftWrap, o.GiftWrapFee.Amount);

    // Tells the admin UI which buttons to render, straight from the
    // aggregate's own state machine. The frontend never has to duplicate
    // "can I ship this?" logic, so it can never get it wrong.
    private static IReadOnlyList<string> GetAllowedActions(Order o)
    {
        var actions = new List<string>();
        if (o.CanBeShipped) actions.Add("Ship");
        if (o.CanBeDelivered) actions.Add("Deliver");
        if (o.CanCorrectTracking) actions.Add("CorrectTracking");
        if (o.CanBeCancelled) actions.Add("Cancel");
        return actions;
    }
}