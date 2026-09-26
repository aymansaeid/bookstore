using BookStore.Api.Common;
using BookStore.Application.Common;
using BookStore.Application.Reviews;
using BookStore.Application.Reviews.Commands;
using BookStore.Application.Reviews.Queries;
using BookStore.Domain.Reviews;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

public sealed record RejectReviewRequest(string Note);

[ApiController]
[Route("api/admin/reviews")]
[Authorize(Roles = nameof(AdminRole.Admin))]
public sealed class AdminReviewsController(ISender sender) : ControllerBase
{
    /// Use ?status=Pending for the moderation queue (oldest first).
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AdminReviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] ReviewStatus? status,
        [FromQuery] int? bookId,
        CancellationToken ct,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20) =>
        (await sender.Send(new ListReviewsForModerationQuery(status, bookId, page, pageSize), ct)).ToActionResult();

    [HttpPost("{id:int}/approve")]
    [ProducesResponseType(typeof(AdminReviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Approve(int id, CancellationToken ct) =>
        (await sender.Send(new ApproveReviewCommand(id), ct)).ToActionResult();

    [HttpPost("{id:int}/reject")]
    [ProducesResponseType(typeof(AdminReviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Reject(int id, RejectReviewRequest request, CancellationToken ct) =>
        (await sender.Send(new RejectReviewCommand(id, request.Note), ct)).ToActionResult();
}