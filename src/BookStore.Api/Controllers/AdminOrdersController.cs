using BookStore.Api.Common;
using BookStore.Application.Common;
using BookStore.Application.Orders;
using BookStore.Application.Orders.Commands;
using BookStore.Application.Orders.Queries;
using BookStore.Domain.Orders;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

public sealed record ShipOrderRequest(string Carrier, string TrackingNumber);
public sealed record CancelOrderRequest(string Reason);

[Authorize(Roles = nameof(AdminRole.Admin))]
[ApiController]
[Route("api/admin/orders")]
public sealed class AdminOrdersController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AdminOrderSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] OrderStatus? status,
        [FromQuery] string? search,
        CancellationToken ct,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20) =>
        (await sender.Send(new ListOrdersQuery(status, search, page, pageSize), ct)).ToActionResult();

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AdminOrderDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        (await sender.Send(new GetAdminOrderByIdQuery(id), ct)).ToActionResult();

    [HttpPost("{id:int}/ship")]
    [ProducesResponseType(typeof(AdminOrderDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Ship(int id, ShipOrderRequest request, CancellationToken ct) =>
        (await sender.Send(new ShipOrderCommand(id, request.Carrier, request.TrackingNumber), ct)).ToActionResult();

    [HttpPut("{id:int}/tracking")]
    [ProducesResponseType(typeof(AdminOrderDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CorrectTracking(int id, ShipOrderRequest request, CancellationToken ct) =>
        (await sender.Send(new CorrectTrackingInfoCommand(id, request.Carrier, request.TrackingNumber), ct))
        .ToActionResult();

    [HttpPost("{id:int}/deliver")]
    [ProducesResponseType(typeof(AdminOrderDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Deliver(int id, CancellationToken ct) =>
        (await sender.Send(new MarkOrderDeliveredCommand(id), ct)).ToActionResult();

    [HttpPost("{id:int}/cancel")]
    [ProducesResponseType(typeof(AdminOrderDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cancel(int id, CancelOrderRequest request, CancellationToken ct) =>
        (await sender.Send(new CancelOrderCommand(id, request.Reason), ct)).ToActionResult();
}