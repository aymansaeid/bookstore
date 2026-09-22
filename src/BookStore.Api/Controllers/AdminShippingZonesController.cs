using BookStore.Api.Common;
using BookStore.Api.Contracts;
using BookStore.Application.Shipping;
using BookStore.Application.Shipping.Commands;
using BookStore.Application.Shipping.Queries;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace BookStore.Api.Controllers;

public sealed record UpdateShippingZoneRequest(string Name, decimal FlatRate, IReadOnlyList<string> CountryCodes);

[Authorize(Roles = nameof(AdminRole.Admin))]
[ApiController]
[Route("api/admin/shipping-zones")]
public sealed class AdminShippingZonesController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminShippingZoneDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        (await sender.Send(new GetAdminShippingZonesQuery(), ct)).ToActionResult();

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AdminShippingZoneDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        (await sender.Send(new GetAdminShippingZoneByIdQuery(id), ct)).ToActionResult();

    [HttpPost]
    [ProducesResponseType(typeof(AdminShippingZoneDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(CreateShippingZoneCommand command, CancellationToken ct)
    {
        var result = await sender.Send(command, ct);
        return result.IsSuccess
            ? CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value)
            : result.Error.ToProblem();
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(AdminShippingZoneDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(int id, UpdateShippingZoneRequest request, CancellationToken ct) =>
        (await sender.Send(new UpdateShippingZoneCommand(id, request.Name, request.FlatRate, request.CountryCodes), ct))
        .ToActionResult();

    [HttpPut("{id:int}/active")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetActive(int id, SetActiveRequest request, CancellationToken ct) =>
        (await sender.Send(new SetShippingZoneActiveCommand(id, request.IsActive), ct)).ToActionResult();

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) =>
        (await sender.Send(new DeleteShippingZoneCommand(id), ct)).ToActionResult();
}