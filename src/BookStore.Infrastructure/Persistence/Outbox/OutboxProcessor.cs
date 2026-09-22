using BookStore.Application.Abstractions.Outbox;
using BookStore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookStore.Infrastructure.Outbox;

public sealed class OutboxOptions
{
    public const string SectionName = "Outbox";

    public int PollIntervalSeconds { get; init; } = 10;
    public int BatchSize { get; init; } = 20;
}

/// <summary>
/// Polls OutboxMessages and dispatches each to its handler.
///
/// Single-instance assumption: if you run two copies of the API, both can
/// claim the same message and send a duplicate email. Scaling out means
/// adding a claim step (an UPDATE that stamps a lock before processing).
/// Flagged here rather than built, since it's a deployment decision.
///
/// At-least-once delivery: if the email sends but marking it processed
/// fails, it will be retried and the customer gets a second copy. That's
/// the correct trade for order emails — a duplicate confirmation is far
/// better than a missing one.
/// </summary>
public sealed class OutboxProcessor(
    IServiceScopeFactory scopeFactory,
    IOptions<OutboxOptions> options,
    ILogger<OutboxProcessor> logger) : BackgroundService
{
    private readonly OutboxOptions _options = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Outbox processor started, polling every {Seconds}s.", _options.PollIntervalSeconds);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(_options.PollIntervalSeconds));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await ProcessBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Never let the loop die: a DB blip shouldn't permanently
                // stop email delivery until someone restarts the app.
                logger.LogError(ex, "Outbox batch failed; will retry on the next tick.");
            }
        }

        logger.LogInformation("Outbox processor stopping.");
    }

    private async Task ProcessBatchAsync(CancellationToken ct)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BookStoreDbContext>();
        var handlers = scope.ServiceProvider.GetServices<IOutboxMessageHandler>().ToList();

        var now = DateTimeOffset.UtcNow;

        var messages = await dbContext.Set<Persistence.Outbox.OutboxMessage>()
            .Where(m => m.ProcessedOnUtc == null && !m.IsDeadLettered && m.NextAttemptAtUtc <= now)
            .OrderBy(m => m.OccurredOnUtc)
            .Take(_options.BatchSize)
            .ToListAsync(ct);

        if (messages.Count == 0)
            return;

        foreach (var message in messages)
        {
            var matching = handlers.Where(h => h.MessageType == message.Type).ToList();

            if (matching.Count == 0)
            {
                // No handler is a permanent condition, not a transient one —
                // dead-letter immediately instead of retrying five times.
                logger.LogWarning("No handler for outbox message type {Type}; dead-lettering {Id}.",
                    message.Type, message.Id);

                for (var i = 0; i < OutboxMessageConstants.MaxAttempts; i++)
                    message.MarkFailed($"No handler registered for type '{message.Type}'.");

                continue;
            }

            try
            {
                foreach (var handler in matching)
                    await handler.HandleAsync(message.PayloadJson, ct);

                message.MarkProcessed();
                logger.LogInformation("Processed outbox message {Id} ({Type}).", message.Id, message.Type);
            }
            catch (Exception ex)
            {
                message.MarkFailed(ex.ToString());

                if (message.IsDeadLettered)
                    logger.LogError(ex, "Outbox message {Id} ({Type}) dead-lettered after {Attempts} attempts.",
                        message.Id, message.Type, message.RetryCount);
                else
                    logger.LogWarning(ex, "Outbox message {Id} ({Type}) failed, attempt {Attempt}; retrying at {NextAttempt}.",
                        message.Id, message.Type, message.RetryCount, message.NextAttemptAtUtc);
            }
        }

        // One save for the whole batch: each message already holds its own
        // final state, so a crash before this point just means the batch is
        // retried, which the at-least-once contract already covers.
        await dbContext.SaveChangesAsync(ct);
    }
}

internal static class OutboxMessageConstants
{
    public const int MaxAttempts = Persistence.Outbox.OutboxMessage.MaxAttempts;
}