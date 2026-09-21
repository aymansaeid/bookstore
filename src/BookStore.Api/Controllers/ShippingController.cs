using BookStore.Api.Common;
using BookStore.Application.Shipping;
using BookStore.Application.Shipping.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

[ApiController]
[Route("api/shipping")]
public sealed class ShippingController(ISender sender) : ControllerBase
{
    /// Every country we ship to, with its rate. Drives the checkout
    /// country dropdown and the shipping-cost preview on the frontend.
    [HttpGet("rates")]
    [ProducesResponseType(typeof(IReadOnlyList<PublicShippingRateDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRates(CancellationToken ct) =>
        (await sender.Send(new GetPublicShippingRatesQuery(), ct)).ToActionResult();
}