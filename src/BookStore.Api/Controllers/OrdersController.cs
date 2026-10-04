using BookStore.Api.Common;
using BookStore.Application.Orders;
using BookStore.Application.Orders.Checkout;
using BookStore.Application.Orders.Commands;
using BookStore.Application.Orders.Queries;
using BookStore.Domain.Orders;
using BookStore.Infrastructure.Auth;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;
namespace BookStore.Api.Controllers;

public sealed record TrackOrderRequest(string OrderNumber, string Email);

public sealed record CheckoutRequest(
    string CustomerEmail,
    IReadOnlyCollection<CartLineDto> Lines,
    ShippingAddressDto? ShippingAddress,
    int? SavedAddressId,
    string? CouponCode,
    string AcceptedTermsVersion,
    string? ShippingMethod = null,
    bool GiftWrap = false,
    string? GiftMessage = null);

public sealed record QuoteRequest(
    IReadOnlyCollection<CartLineDto> Lines,
    string? CountryCode,
    int? SavedAddressId,
    string? CouponCode,
    string? ShippingMethod,
    bool GiftWrap = false);

public sealed record CancelMyOrderRequest(
    string OrderNumber, string Email, CustomerCancelReason Reason, string? Comment);

[ApiController]
[Route("api/orders")]
public sealed class OrdersController(ISender sender) : ControllerBase
{
    [HttpPost("checkout")]
    [EnableRateLimiting("checkout")]
    [ProducesResponseType(typeof(CheckoutCartResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Checkout(
        CheckoutRequest request,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        CancellationToken ct)
    {
        // Anonymous endpoint, but a valid customer token binds the order to
        // that account. The id comes from the verified token, never the body.
        var authResult = await HttpContext.AuthenticateAsync(CustomerTokenGenerator.CustomerScheme);
        int? customerId = authResult.Succeeded
            ? int.Parse(authResult.Principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!)
            : null;

        var command = new CheckoutCartCommand(
        request.CustomerEmail,
        request.Lines,
        request.ShippingAddress,
        request.SavedAddressId,
        request.CouponCode,
        request.AcceptedTermsVersion,
        idempotencyKey ?? string.Empty,
        customerId,
        HttpContext.Connection.RemoteIpAddress?.ToString(),
        request.ShippingMethod,
        request.GiftWrap,
        request.GiftMessage);

        return (await sender.Send(command, ct)).ToActionResult();
    }

    // POST, not GET: keeps the email out of URLs and server logs.
    [HttpPost("track")]
    [EnableRateLimiting("order-lookup")]
    [ProducesResponseType(typeof(PublicOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Track(TrackOrderRequest request, CancellationToken ct) =>
        (await sender.Send(new TrackOrderQuery(request.OrderNumber, request.Email), ct)).ToActionResult();

    /// Server-calculated cart totals: call on every cart change. Never fails
    /// for stock/coupon/shipping problems; they come back in `problems`.
    [HttpPost("quote")]
    [EnableRateLimiting("quote")]
    [ProducesResponseType(typeof(CheckoutQuoteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Quote(QuoteRequest request, CancellationToken ct) =>
        (await sender.Send(new QuoteCheckoutQuery(
            request.Lines, request.CountryCode, request.SavedAddressId, request.CouponCode,
            request.ShippingMethod, request.GiftWrap, await OptionalCustomerIdAsync()), ct)).ToActionResult();

    private async Task<int?> OptionalCustomerIdAsync()
    {
        // Anonymous endpoints, but a valid customer token is honoured. The id
        // always comes from the verified token, never from the request body.
        var auth = await HttpContext.AuthenticateAsync(CustomerTokenGenerator.CustomerScheme);
        return auth.Succeeded ? int.Parse(auth.Principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!) : null;
    }

    /// Customer or guest cancels before shipping. Paid orders are refunded.
    [HttpPost("cancel")]
    [EnableRateLimiting("order-lookup")]
    [ProducesResponseType(typeof(PublicOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cancel(CancelMyOrderRequest r, CancellationToken ct) =>
        (await sender.Send(new CancelMyOrderCommand(r.OrderNumber, r.Email, r.Reason, r.Comment), ct)).ToActionResult();
}