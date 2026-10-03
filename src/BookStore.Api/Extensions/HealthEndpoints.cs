using Microsoft.AspNetCore.Diagnostics.HealthChecks;

namespace BookStore.Api.Extensions;

public static class HealthEndpoints
{
    public static void MapBookStoreHealthChecks(this IEndpointRouteBuilder app)
    {
        // Liveness: runs NO checks. Only answers "is the process responsive?"
        // A database outage must never fail this, or the host restarts a
        // perfectly healthy app in a loop.
        app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false })
            .AllowAnonymous()
            .DisableRateLimiting();

        // Readiness: can this instance serve customers? Unhealthy -> 503
        // (take it out of rotation); Degraded -> 200 (keep serving).
        // The body is just the status word; details are admin-only.
        app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = c => c.Tags.Contains("ready") })
            .AllowAnonymous()
            .DisableRateLimiting();
    }
}