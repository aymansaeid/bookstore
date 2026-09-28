using BookStore.Api.Common;
using BookStore.Application.Orders;
using BookStore.Application.Orders.Checkout;
using BookStore.Application.Orders.Queries;
using BookStore.Infrastructure.Auth;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;
namespace BookStore.Api.Controllers;

public sealed record TrackOrderRequest(string OrderNumber, string Email);

public sealed record CheckoutRequest(
    string CustomerEmail,
    IReadOnlyCollection<CartLineDto> Lines,
    ShippingAddressDto? ShippingAddress,
    int? SavedAddressId,
    string? CouponCode,
    string AcceptedTermsVersion);

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
            // Behind a proxy this is the proxy's IP until forwarded headers are
            // configured (step 7b).
            HttpContext.Connection.RemoteIpAddress?.ToString());

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
}