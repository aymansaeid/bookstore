using BookStore.Application.Payments.Commands;
using BookStore.Application.Payments.Queries;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BookStore.Infrastructure.Payments;

public sealed record SweepSummary(int Due, IReadOnlyDictionary<string, int> Outcomes, int Failures);

/// Shared by the background worker and the dev "sweep now" endpoint, so both
/// exercise the same code.
public sealed class CheckoutSweepRunner(IServiceScopeFactory scopeFactory, ILogger<CheckoutSweepRunner> logger)
{
    public async Task<SweepSummary> RunOnceAsync(CancellationToken ct)
    {
        IReadOnlyList<int> dueIds;

        await using (var scope = scopeFactory.CreateAsyncScope())
        {
            var sender = scope.ServiceProvider.GetRequiredService<ISender>();
            dueIds = (await sender.Send(new GetDueCheckoutOrderIdsQuery(), ct)).Value;
        }

        var outcomes = new Dictionary<string, int>();
        var failures = 0;

        foreach (var orderId in dueIds)
        {
            // A fresh scope, and therefore a fresh DbContext, per order. If
            // one order hits a concurrency conflict, its half-modified entity
            // dies with its scope instead of breaking every save after it.
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var sender = scope.ServiceProvider.GetRequiredService<ISender>();

                var result = await sender.Send(new ExpireCheckoutCommand(orderId), ct);

                if (result.IsSuccess)
                {
                    var key = result.Value.ToString();
                    outcomes[key] = outcomes.GetValueOrDefault(key) + 1;
                }
                else
                {
                    failures++;
                    logger.LogWarning("Sweep could not expire order {OrderId}: {Error}", orderId, result.Error.Message);
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                // Typically a concurrency conflict with an admin action on the
                // same order. The next sweep picks it up again if still pending.
                failures++;
                logger.LogError(ex, "Sweep failed for order {OrderId}; will retry next run.", orderId);
            }
        }

        if (dueIds.Count > 0)
            logger.LogInformation(
                "Checkout sweep: {Due} due, outcomes {Outcomes}, {Failures} failure(s).",
                dueIds.Count, string.Join(", ", outcomes.Select(kv => $"{kv.Key}={kv.Value}")), failures);

        return new SweepSummary(dueIds.Count, outcomes, failures);
    }
}