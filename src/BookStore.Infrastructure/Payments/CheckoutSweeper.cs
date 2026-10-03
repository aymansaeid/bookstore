using BookStore.Application.Payments;
using BookStore.Infrastructure.Health;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookStore.Infrastructure.Payments;

public sealed class CheckoutSweeper(
    CheckoutSweepRunner runner,
    IOptions<CheckoutSweepOptions> options,
    BackgroundJobHeartbeat heartbeat,
    ILogger<CheckoutSweeper> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        heartbeat.Register("checkout-sweep", TimeSpan.FromMinutes(options.Value.IntervalMinutes));
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        logger.LogInformation("Checkout sweeper started, running every {Minutes} min.", options.Value.IntervalMinutes);

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(options.Value.IntervalMinutes));

        do
        {
            try
            {
                await runner.RunOnceAsync(stoppingToken);
                heartbeat.ReportRun("checkout-sweep", succeeded: true);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                heartbeat.ReportRun("checkout-sweep", succeeded: false);
                logger.LogError(ex, "Checkout sweep failed; will retry next interval.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}