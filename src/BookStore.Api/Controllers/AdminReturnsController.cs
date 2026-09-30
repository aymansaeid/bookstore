using BookStore.Api.Common;
using BookStore.Application.Common;
using BookStore.Application.Returns;
using BookStore.Application.Returns.Commands;
using BookStore.Application.Returns.Queries;
using BookStore.Domain.Returns;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

public sealed record ApproveReturnRequest(string? Instructions);
public sealed record RejectReturnRequest(string Reason);
public sealed record CompleteReturnRequest(IReadOnlyList<ReturnLineConditionDto> Conditions);

[ApiController]
[Route("api/admin/returns")]
[Authorize(Roles = nameof(AdminRole.Admin))]
public sealed class AdminReturnsController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AdminReturnSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] ReturnStatus? status, CancellationToken ct, [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        (await sender.Send(new ListReturnsQuery(status, page, pageSize), ct)).ToActionResult();

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AdminReturnDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        (await sender.Send(new GetAdminReturnQuery(id), ct)).ToActionResult();

    /// Omit instructions to use the default from config.
    [HttpPost("{id:int}/approve")]
    [ProducesResponseType(typeof(AdminReturnDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Approve(int id, ApproveReturnRequest request, CancellationToken ct) =>
        (await sender.Send(new ApproveReturnCommand(id, request.Instructions), ct)).ToActionResult();

    [HttpPost("{id:int}/reject")]
    [ProducesResponseType(typeof(AdminReturnDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reject(int id, RejectReturnRequest request, CancellationToken ct) =>
        (await sender.Send(new RejectReturnCommand(id, request.Reason), ct)).ToActionResult();

    /// The parcel arrived: record each book's condition. Refunds immediately.
    [HttpPost("{id:int}/complete")]
    [ProducesResponseType(typeof(AdminReturnDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Complete(int id, CompleteReturnRequest request, CancellationToken ct) =>
        (await sender.Send(new CompleteReturnCommand(id, request.Conditions), ct)).ToActionResult();
}