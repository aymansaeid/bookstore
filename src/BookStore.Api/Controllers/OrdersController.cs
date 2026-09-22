using BookStore.Api.Common;
using BookStore.Application.Orders;
using BookStore.Application.Orders.Checkout;
using BookStore.Application.Orders.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

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
    public async Task<IActionResult> Checkout(CheckoutCartCommand command, CancellationToken ct) =>
        (await sender.Send(command, ct)).ToActionResult();

    // POST, not GET: keeps the email out of URLs and server logs.
    [HttpPost("track")]
    [EnableRateLimiting("order-lookup")]
    [ProducesResponseType(typeof(PublicOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Track(TrackOrderRequest request, CancellationToken ct) =>
        (await sender.Send(new TrackOrderQuery(request.OrderNumber, request.Email), ct)).ToActionResult();
}