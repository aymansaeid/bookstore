using BookStore.Domain.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace BookStore.Api.Controllers;

public sealed record HealthEntryDto(
    string Name, string Status, string? Description, double DurationMs,
    IReadOnlyDictionary<string, string?> Data, string? Error);

public sealed record HealthReportDto(string Status, double TotalDurationMs, IReadOnlyList<HealthEntryDto> Checks);

/// Full diagnostics, admin-only. Pure infrastructure with no business logic,
/// so it talks to the health service directly rather than via MediatR.
[ApiController]
[Route("api/admin/health")]
[Authorize(Roles = nameof(AdminRole.Admin))]
public sealed class AdminHealthController(HealthCheckService healthCheckService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(HealthReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var report = await healthCheckService.CheckHealthAsync(ct);

        return Ok(new HealthReportDto(
            report.Status.ToString(),
            report.TotalDuration.TotalMilliseconds,
            report.Entries
                .Select(e => new HealthEntryDto(
                    e.Key,
                    e.Value.Status.ToString(),
                    e.Value.Description,
                    e.Value.Duration.TotalMilliseconds,
                    e.Value.Data.ToDictionary(d => d.Key, d => d.Value?.ToString()),
                    // Message only, never the stack trace, even for admins.
                    e.Value.Exception?.Message))
                .ToList()));
    }
}