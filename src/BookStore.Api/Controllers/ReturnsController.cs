using BookStore.Api.Common;
using BookStore.Application.Returns;
using BookStore.Application.Returns.Commands;
using BookStore.Application.Returns.Queries;
using BookStore.Domain.Returns;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BookStore.Api.Controllers;

public sealed record ReturnLookupRequest(string OrderNumber, string Email);

public sealed record RequestReturnRequest(
    string OrderNumber, string Email, IReadOnlyCollection<ReturnItem> Items, ReturnReason Reason, string? Comment);

/// Guests and signed-in customers use the same endpoints: the withdrawal
/// right doesn't depend on having an account. POST everywhere keeps emails
/// out of URLs.
[ApiController]
[Route("api/returns")]
[EnableRateLimiting("order-lookup")]
public sealed class ReturnsController(ISender sender) : ControllerBase
{
    /// Drives the return form: can this order be returned, until when, and
    /// which books (and how many) are on it.
    [HttpPost("eligibility")]
    [ProducesResponseType(typeof(ReturnEligibilityDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Eligibility(ReturnLookupRequest r, CancellationToken ct) =>
        (await sender.Send(new GetReturnEligibilityQuery(r.OrderNumber, r.Email), ct)).ToActionResult();

    [HttpPost]
    [ProducesResponseType(typeof(PublicReturnDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Request(RequestReturnRequest r, CancellationToken ct) =>
        (await sender.Send(new RequestReturnCommand(r.OrderNumber, r.Email, r.Items, r.Reason, r.Comment), ct))
        .ToActionResult();

    [HttpPost("status")]
    [ProducesResponseType(typeof(PublicReturnDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Status(ReturnLookupRequest r, CancellationToken ct) =>
        (await sender.Send(new GetReturnStatusQuery(r.OrderNumber, r.Email), ct)).ToActionResult();

    [HttpPost("cancel")]
    [ProducesResponseType(typeof(PublicReturnDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cancel(ReturnLookupRequest r, CancellationToken ct) =>
        (await sender.Send(new CancelReturnCommand(r.OrderNumber, r.Email), ct)).ToActionResult();
}