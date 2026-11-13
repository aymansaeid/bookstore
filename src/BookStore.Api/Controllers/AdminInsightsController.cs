using BookStore.Api.Common;
using BookStore.Application.Admin.Insights;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = nameof(AdminRole.Admin))]
public sealed class AdminInsightsController(ISender sender) : ControllerBase
{
    /// The dashboard's KPI cards with sparklines. days: 7 to 90 (default 30).
    [HttpGet("kpis")]
    [ProducesResponseType(typeof(AdminKpisDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Kpis(CancellationToken ct, [FromQuery] int days = 30) =>
        (await sender.Send(new GetAdminKpisQuery(days), ct)).ToActionResult();

    /// ⌘K. Fewer than 2 characters returns "needs attention" quick views
    /// instead of results.
    [HttpGet("search")]
    [ProducesResponseType(typeof(AdminSearchResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search([FromQuery] string? q, CancellationToken ct) =>
        (await sender.Send(new AdminSearchQuery(q), ct)).ToActionResult();
}