using System.Collections.Concurrent;

namespace BookStore.Infrastructure.Health;

public sealed record JobState(
    TimeSpan ExpectedInterval,
    DateTimeOffset RegisteredAtUtc,
    DateTimeOffset LastRunUtc,
    DateTimeOffset? LastSuccessUtc);

public sealed record JobProblem(string JobName, string Description);

/// Each background worker registers on startup and reports after every run.
/// A worker that stops reporting (crashed loop) or keeps failing (e.g. SMTP
/// down for an hour) shows up here, even though it never breaks a request.
public sealed class BackgroundJobHeartbeat(TimeProvider timeProvider)
{
    private readonly ConcurrentDictionary<string, JobState> _jobs = new();

    public void Register(string jobName, TimeSpan expectedInterval)
    {
        var now = timeProvider.GetUtcNow();
        _jobs[jobName] = new JobState(expectedInterval, now, now, null);
    }

    public void ReportRun(string jobName, bool succeeded)
    {
        var now = timeProvider.GetUtcNow();

        _jobs.AddOrUpdate(
            jobName,
            _ => new JobState(TimeSpan.FromMinutes(1), now, now, succeeded ? now : null),
            (_, state) => state with
            {
                LastRunUtc = now,
                LastSuccessUtc = succeeded ? now : state.LastSuccessUtc
            });
    }

    public IReadOnlyDictionary<string, JobState> Snapshot() => _jobs.ToDictionary(kv => kv.Key, kv => kv.Value);

    public IReadOnlyList<JobProblem> FindProblems()
    {
        var now = timeProvider.GetUtcNow();
        var problems = new List<JobProblem>();

        foreach (var (name, state) in _jobs)
        {
            var tolerance = ToleranceFor(state.ExpectedInterval);

            if (now - state.LastRunUtc > tolerance)
            {
                problems.Add(new JobProblem(name,
                    $"hasn't run since {state.LastRunUtc:u} (expected every {state.ExpectedInterval})."));
                continue;
            }

            // Running, but every run fails: measured from the last success,
            // or from startup if it has never succeeded at all.
            var lastGood = state.LastSuccessUtc ?? state.RegisteredAtUtc;
            if (now - lastGood > tolerance)
            {
                problems.Add(new JobProblem(name,
                    state.LastSuccessUtc is null
                        ? "has never completed a successful run."
                        : $"has been failing since {state.LastSuccessUtc:u}."));
            }
        }

        return problems;
    }

    /// Three missed intervals plus a minute of slack. One slow or failed run
    /// is normal; three in a row is a problem.
    private static TimeSpan ToleranceFor(TimeSpan interval) => interval * 3 + TimeSpan.FromMinutes(1);
}