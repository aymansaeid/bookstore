using System.Collections.Concurrent;

namespace BookStore.Infrastructure.Payments;

public enum MockSessionStatus
{
    Open = 0,
    Completed = 1,
    Expired = 2
}

/// In-memory stand-in for the gateway's own records. Resets on restart,
/// which is fine for local development.
public sealed class MockPaymentState
{
    private readonly ConcurrentDictionary<string, MockSession> _sessions = new();
    private readonly ConcurrentDictionary<string, string> _sessionsByIdempotencyKey = new();
    private readonly ConcurrentDictionary<string, string> _refundsByIdempotencyKey = new();

    public MockSession GetOrCreateSession(
        string idempotencyKey, Func<MockSession> create)
    {
        var sessionId = _sessionsByIdempotencyKey.GetOrAdd(idempotencyKey, _ =>
        {
            var session = create();
            _sessions[session.SessionId] = session;
            return session.SessionId;
        });

        return _sessions[sessionId];
    }

    public MockSession? GetSession(string sessionId) => _sessions.GetValueOrDefault(sessionId);

    public string GetOrCreateRefund(string idempotencyKey) =>
        _refundsByIdempotencyKey.GetOrAdd(idempotencyKey, _ => $"mock_re_{Guid.NewGuid():N}");
}

public sealed class MockSession(
    string sessionId, string orderNumber, decimal total, string currency, DateTimeOffset expiresAtUtc)
{
    private readonly object _lock = new();

    public string SessionId { get; } = sessionId;
    public string OrderNumber { get; } = orderNumber;
    public decimal Total { get; } = total;
    public string Currency { get; } = currency;
    public DateTimeOffset ExpiresAtUtc { get; } = expiresAtUtc;

    /// Stable per session, so replaying a payment reports the same reference,
    /// just like a real gateway would.
    public string PaymentReference { get; } = $"mock_pi_{Guid.NewGuid():N}";

    public MockSessionStatus Status { get; private set; } = MockSessionStatus.Open;

    /// Behaves like a real gateway: an expired or closed session can't be
    /// paid, and paying a completed session again is a harmless replay.
    public bool TryComplete()
    {
        lock (_lock)
        {
            if (Status == MockSessionStatus.Completed)
                return true;

            if (Status == MockSessionStatus.Expired || DateTimeOffset.UtcNow > ExpiresAtUtc)
            {
                Status = MockSessionStatus.Expired;
                return false;
            }

            Status = MockSessionStatus.Completed;
            return true;
        }
    }

    public bool TryExpire()
    {
        lock (_lock)
        {
            if (Status == MockSessionStatus.Completed)
                return false;

            Status = MockSessionStatus.Expired;
            return true;
        }
    }
}