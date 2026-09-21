using BookStore.Application.Orders.Checkout;
using BookStore.Api.Common;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

[ApiController]
[Route("api/orders")]
public sealed class OrdersController(ISender sender) : ControllerBase
{
    [HttpPost("checkout")]
    [ProducesResponseType(typeof(CheckoutCartResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Checkout(CheckoutCartCommand command, CancellationToken ct)
    {
        var result = await sender.Send(command, ct);
        return result.ToActionResult();
    }
}