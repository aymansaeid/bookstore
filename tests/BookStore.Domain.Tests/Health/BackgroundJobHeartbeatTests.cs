using BookStore.Infrastructure.Health;
using FluentAssertions;
using Microsoft.Extensions.Time.Testing;

namespace BookStore.Domain.Tests.Health;

public class BackgroundJobHeartbeatTests
{
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 9, 30, 12, 0, 0, TimeSpan.Zero));
    private readonly BackgroundJobHeartbeat _heartbeat;

    public BackgroundJobHeartbeatTests() => _heartbeat = new BackgroundJobHeartbeat(_time);

    [Fact]
    public void RunningJob_HasNoProblems()
    {
        _heartbeat.Register("sweep", TimeSpan.FromMinutes(5));

        _time.Advance(TimeSpan.FromMinutes(5));
        _heartbeat.ReportRun("sweep", succeeded: true);

        _heartbeat.FindProblems().Should().BeEmpty();
    }

    [Fact]
    public void StalledJob_IsReported()
    {
        _heartbeat.Register("sweep", TimeSpan.FromMinutes(5));

        // Tolerance is 3 x 5 min + 1 min = 16 min. The loop died silently.
        _time.Advance(TimeSpan.FromMinutes(17));

        _heartbeat.FindProblems().Should().ContainSingle(p => p.JobName == "sweep" && p.Description.Contains("hasn't run"));
    }

    [Fact]
    public void JobThatRunsButAlwaysFails_IsReported()
    {
        _heartbeat.Register("outbox", TimeSpan.FromMinutes(1));

        // Keeps running on schedule (so it isn't "stalled") but never succeeds.
        for (var i = 0; i < 6; i++)
        {
            _time.Advance(TimeSpan.FromMinutes(1));
            _heartbeat.ReportRun("outbox", succeeded: false);
        }

        _heartbeat.FindProblems().Should().ContainSingle(p => p.Description.Contains("never completed"));
    }

    [Fact]
    public void Recovery_ClearsTheProblem()
    {
        _heartbeat.Register("outbox", TimeSpan.FromMinutes(1));
        _time.Advance(TimeSpan.FromMinutes(10));
        _heartbeat.FindProblems().Should().NotBeEmpty();

        _heartbeat.ReportRun("outbox", succeeded: true);

        _heartbeat.FindProblems().Should().BeEmpty();
    }
}