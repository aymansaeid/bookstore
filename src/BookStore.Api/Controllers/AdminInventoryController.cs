using BookStore.Api.Common;
using BookStore.Application.Books;
using BookStore.Application.Inventory;
using BookStore.Application.Inventory.Commands;
using BookStore.Application.Inventory.Queries;
using BookStore.Application.Notifications.Queries;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

public sealed record SetThresholdRequest(int Threshold);

[ApiController]
[Route("api/admin/inventory")]
[Authorize(Roles = nameof(AdminRole.Admin))]
public sealed class AdminInventoryController(ISender sender) : ControllerBase
{
    [HttpGet("books/{bookId:int}/movements")]
    [ProducesResponseType(typeof(StockHistoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMovements(
        int bookId, CancellationToken ct, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) =>
        (await sender.Send(new GetStockHistoryQuery(bookId, page, pageSize), ct)).ToActionResult();

    [HttpGet("reconciliation")]
    [ProducesResponseType(typeof(IReadOnlyList<ReconciliationRowDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReconciliation(CancellationToken ct) =>
        (await sender.Send(new GetStockReconciliationQuery(), ct)).ToActionResult();

    [HttpPut("books/{bookId:int}/low-stock-threshold")]
    [ProducesResponseType(typeof(AdminBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetThreshold(int bookId, SetThresholdRequest request, CancellationToken ct) =>
        (await sender.Send(new SetLowStockThresholdCommand(bookId, request.Threshold), ct)).ToActionResult();

    [HttpGet("books/{bookId:int}/waiting-list")]
    [ProducesResponseType(typeof(WaitingListCountDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWaitingList(int bookId, CancellationToken ct) =>
        (await sender.Send(new GetWaitingListCountQuery(bookId), ct)).ToActionResult();

    /// Runs the hourly scan right now; returns how many books were alerted.
    [HttpPost("low-stock/check")]
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    public async Task<IActionResult> CheckLowStock(CancellationToken ct) =>
        (await sender.Send(new CheckLowStockCommand(), ct)).ToActionResult();
}