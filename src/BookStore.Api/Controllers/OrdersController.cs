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

[ApiController]
[Route("api/orders")]
public sealed class OrdersController(ISender sender) : ControllerBase
{
    [HttpPost("checkout")]
    [ProducesResponseType(typeof(CheckoutCartResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Checkout(CheckoutCartCommand command, CancellationToken ct)
    {
        // Anonymous endpoint (guests must be able to buy), but if a valid
        // customer token came along, bind the order to that account. The id
        // comes from the verified token, never from the request body — a
        // client-supplied CustomerId would let anyone write to another
        // account's order history.
        var authResult = await HttpContext.AuthenticateAsync(CustomerTokenGenerator.CustomerScheme);

        int? customerId = authResult.Succeeded
            ? int.Parse(authResult.Principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!)
            : null;

        var result = await sender.Send(command with { CustomerId = customerId }, ct);
        return result.ToActionResult();
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