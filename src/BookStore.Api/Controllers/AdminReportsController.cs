using BookStore.Api.Common;
using BookStore.Application.Auditing.Queries;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Common;
using BookStore.Application.Reports;
using BookStore.Application.Reports.Queries;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace BookStore.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = nameof(AdminRole.Admin))]
public sealed class AdminReportsController(ISender sender) : ControllerBase
{
    /// Defaults to the last 30 days in the store's time zone.
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(DashboardDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Dashboard(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct) =>
        (await sender.Send(new GetDashboardQuery(from, to), ct)).ToActionResult();

    /// Use delimiter=Semicolon for Excel with Turkish regional settings.
    [HttpGet("reports/orders.csv")]
    [Produces("text/csv")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportOrders(
        [FromQuery, BindRequired] DateOnly from,
        [FromQuery, BindRequired] DateOnly to,
        CancellationToken ct,
        [FromQuery] CsvDelimiter delimiter = CsvDelimiter.Comma)
    {
        var result = await sender.Send(new ExportOrdersCsvQuery(from, to, delimiter), ct);

        return result.IsSuccess
            ? File(result.Value.Content, "text/csv; charset=utf-8", result.Value.FileName)
            : result.Error.ToProblem();
    }

    [HttpGet("audit-log")]
    [ProducesResponseType(typeof(PagedResult<AuditLogEntryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> AuditLog(
        [FromQuery] string? entityType,
        [FromQuery] string? entityId,
        [FromQuery] int? adminUserId,
        CancellationToken ct,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50) =>
        (await sender.Send(new ListAuditLogQuery(entityType, entityId, adminUserId, page, pageSize), ct))
        .ToActionResult();
}