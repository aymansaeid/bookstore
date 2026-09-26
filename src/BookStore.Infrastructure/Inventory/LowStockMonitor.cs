using BookStore.Application.Inventory.Commands;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookStore.Infrastructure.Inventory;

public sealed class LowStockMonitorOptions
{
    public const string SectionName = "LowStockMonitor";
    public int IntervalMinutes { get; init; } = 60;
}

public sealed class LowStockMonitor(
    IServiceScopeFactory scopeFactory,
    IOptions<LowStockMonitorOptions> options,
    ILogger<LowStockMonitor> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let startup (seeding, first requests) settle before the first scan.
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(options.Value.IntervalMinutes));

        do
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var sender = scope.ServiceProvider.GetRequiredService<ISender>();
                await sender.Send(new CheckLowStockCommand(), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Low-stock scan failed; will retry on the next interval.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}