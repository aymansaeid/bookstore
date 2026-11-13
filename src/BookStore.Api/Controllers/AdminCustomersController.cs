using BookStore.Api.Common;
using BookStore.Api.Contracts;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Common;
using BookStore.Application.Customers.Admin;
using BookStore.Application.Loyalty;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

public sealed record AdjustPointsRequest(int Points, string Note);

[ApiController]
[Route("api/admin/customers")]
[Authorize(Roles = nameof(AdminRole.Admin))]
public sealed class AdminCustomersController(ISender sender) : ControllerBase
{
    /// search: email, name, phone, #id or an order number (BK-…).
    /// status: Active | Inactive | Unverified | Anonymized (default: all except anonymized).
    /// sort: Newest (default) | Oldest | TopSpenders | MostOrders | RecentlyActive.
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AdminCustomerSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> List(
        [FromQuery] string? search,
        [FromQuery] AdminCustomerStatus? status,
        CancellationToken ct,
        [FromQuery] AdminCustomerSort sort = AdminCustomerSort.Newest,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20) =>
        (await sender.Send(new GetAdminCustomersQuery(search, status, sort, page, pageSize), ct)).ToActionResult();

    /// Header cards of the customers page.
    [HttpGet("stats")]
    [ProducesResponseType(typeof(AdminCustomerOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Stats(CancellationToken ct) =>
        (await sender.Send(new GetAdminCustomerOverviewQuery(), ct)).ToActionResult();

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AdminCustomerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) =>
        (await sender.Send(new GetAdminCustomerQuery(id), ct)).ToActionResult();

    /// Deactivating also signs the customer out on every device.
    [HttpPut("{id:int}/active")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SetActive(int id, SetActiveRequest request, CancellationToken ct) =>
        (await sender.Send(new SetCustomerActiveCommand(id, request.IsActive), ct)).ToActionResult();

    [HttpPost("{id:int}/sign-out")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SignOutEverywhere(int id, CancellationToken ct) =>
        (await sender.Send(new SignOutCustomerEverywhereCommand(id), ct)).ToActionResult();

    [HttpPost("{id:int}/resend-verification")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ResendVerification(int id, CancellationToken ct) =>
        (await sender.Send(new AdminResendVerificationCommand(id), ct)).ToActionResult();

    [HttpGet("{id:int}/loyalty/history")]
    [ProducesResponseType(typeof(PagedResult<LoyaltyTransactionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> LoyaltyHistory(
        int id, CancellationToken ct, [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        (await sender.Send(new GetLoyaltyHistoryQuery(id, page, pageSize), ct)).ToActionResult();

    /// Positive adds points, negative removes them. The note is shown to the
    /// customer. Send an Idempotency-Key header so a double click adds once.
    [HttpPost("{id:int}/loyalty/adjustments")]
    [ProducesResponseType(typeof(LoyaltySummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AdjustPoints(
        int id,
        AdjustPointsRequest request,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        CancellationToken ct) =>
        (await sender.Send(new AdjustCustomerPointsCommand(id, request.Points, request.Note, idempotencyKey), ct))
        .ToActionResult();
}