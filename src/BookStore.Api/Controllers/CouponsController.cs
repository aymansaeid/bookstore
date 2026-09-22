using BookStore.Api.Common;
using BookStore.Application.Coupons;
using BookStore.Application.Coupons.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BookStore.Api.Controllers;

public sealed record CheckCouponRequest(string Code);

[ApiController]
[Route("api/coupons")]
public sealed class CouponsController(ISender sender) : ControllerBase
{
    // POST rather than GET /coupons/{code}: keeps codes out of URLs, which
    // end up in server logs, browser history, and proxy caches.
    [HttpPost("check")]
    [EnableRateLimiting("coupon-check")]
    [ProducesResponseType(typeof(CouponPreviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Check(CheckCouponRequest request, CancellationToken ct) =>
        (await sender.Send(new CheckCouponQuery(request.Code), ct)).ToActionResult();
}