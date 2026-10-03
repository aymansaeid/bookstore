using BookStore.Infrastructure.Persistence;
using BookStore.Infrastructure.Persistence.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace BookStore.Infrastructure.Health;

public sealed class BackgroundJobsHealthCheck(BackgroundJobHeartbeat heartbeat) : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        var data = heartbeat.Snapshot().ToDictionary(
            kv => kv.Key,
            kv => (object)$"last run {kv.Value.LastRunUtc:u}, last success {(kv.Value.LastSuccessUtc?.ToString("u") ?? "never")}");

        var problems = heartbeat.FindProblems();

        // Degraded, never Unhealthy: customers can still browse and buy
        // while a worker is down, so this must not pull the site offline.
        return Task.FromResult(problems.Count == 0
            ? HealthCheckResult.Healthy("All background jobs are running.", data)
            : HealthCheckResult.Degraded(
                string.Join(" ", problems.Select(p => $"{p.JobName} {p.Description}")), data: data));
    }
}

public sealed class OutboxHealthCheck(BookStoreDbContext dbContext, TimeProvider timeProvider) : IHealthCheck
{
    private static readonly TimeSpan StuckAfter = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan DeadLetterLookback = TimeSpan.FromDays(7);

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        var now = timeProvider.GetUtcNow();
        var messages = dbContext.Set<OutboxMessage>().AsNoTracking();

        // Messages still waiting long after they were written: the worker is
        // running but losing, e.g. to a broken SMTP configuration.
        var stuck = await messages.CountAsync(
            m => m.ProcessedOnUtc == null && !m.IsDeadLettered && m.OccurredOnUtc < now - StuckAfter, ct);

        // Given up on recently. Each one is probably an email a customer
        // never received. Only the last week counts, so one old failure
        // doesn't leave the status Degraded forever.
        var deadLettered = await messages.CountAsync(
            m => m.IsDeadLettered && m.OccurredOnUtc > now - DeadLetterLookback, ct);

        var data = new Dictionary<string, object>
        {
            ["stuckOver15Min"] = stuck,
            ["deadLetteredLast7Days"] = deadLettered
        };

        if (stuck == 0 && deadLettered == 0)
            return HealthCheckResult.Healthy("Outbox is flowing.", data);

        return HealthCheckResult.Degraded(
            $"{stuck} message(s) stuck, {deadLettered} dead-lettered in the last 7 days.", data: data);
    }
}