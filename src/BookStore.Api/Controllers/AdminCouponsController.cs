using BookStore.Api.Common;
using BookStore.Application.Coupons;
using BookStore.Application.Coupons.Commands;
using BookStore.Application.Coupons.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

public sealed record UpdateCouponRequest(int DiscountPercentage, DateTimeOffset ExpiresAtUtc, int? MaxRedemptions);

// TODO (step 6): [Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/coupons")]
public sealed class AdminCouponsController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminCouponDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        (await sender.Send(new GetAdminCouponsQuery(), ct)).ToActionResult();

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AdminCouponDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        (await sender.Send(new GetAdminCouponByIdQuery(id), ct)).ToActionResult();

    [HttpPost]
    [ProducesResponseType(typeof(AdminCouponDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(CreateCouponCommand command, CancellationToken ct)
    {
        var result = await sender.Send(command, ct);
        return result.IsSuccess
            ? CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value)
            : result.Error.ToProblem();
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(AdminCouponDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(int id, UpdateCouponRequest request, CancellationToken ct) =>
        (await sender.Send(new UpdateCouponCommand(
            id, request.DiscountPercentage, request.ExpiresAtUtc, request.MaxRedemptions), ct))
        .ToActionResult();

    [HttpPut("{id:int}/active")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetActive(int id, SetActiveRequest request, CancellationToken ct) =>
        (await sender.Send(new SetCouponActiveCommand(id, request.IsActive), ct)).ToActionResult();

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) =>
        (await sender.Send(new DeleteCouponCommand(id), ct)).ToActionResult();
}