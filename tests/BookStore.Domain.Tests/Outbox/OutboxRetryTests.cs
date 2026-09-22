using BookStore.Infrastructure.Persistence.Outbox;
using FluentAssertions;

namespace BookStore.Domain.Tests.Outbox;

public class OutboxRetryTests
{
    [Fact]
    public void MarkFailed_BacksOffExponentially()
    {
        var message = OutboxMessage.Create("Test", "{}", DateTimeOffset.UtcNow);

        message.MarkFailed("first failure");
        var afterFirst = message.NextAttemptAtUtc;

        message.MarkFailed("second failure");
        var afterSecond = message.NextAttemptAtUtc;

        message.RetryCount.Should().Be(2);
        afterSecond.Should().BeAfter(afterFirst);
        message.IsDeadLettered.Should().BeFalse();
    }

    [Fact]
    public void MarkFailed_DeadLetters_AfterMaxAttempts()
    {
        var message = OutboxMessage.Create("Test", "{}", DateTimeOffset.UtcNow);

        for (var i = 0; i < OutboxMessage.MaxAttempts; i++)
            message.MarkFailed("boom");

        message.IsDeadLettered.Should().BeTrue();
        message.RetryCount.Should().Be(OutboxMessage.MaxAttempts);
    }

    [Fact]
    public void MarkProcessed_ClearsError()
    {
        var message = OutboxMessage.Create("Test", "{}", DateTimeOffset.UtcNow);
        message.MarkFailed("transient");

        message.MarkProcessed();

        message.ProcessedOnUtc.Should().NotBeNull();
        message.Error.Should().BeNull();
    }
}