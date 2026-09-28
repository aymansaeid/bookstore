namespace BookStore.Application.Payments;

public sealed class CheckoutSweepOptions
{
    public const string SectionName = "CheckoutSweep";

    public int IntervalMinutes { get; init; } = 5;

    /// Extra wait after a session's expiry before sweeping it. The
    /// gateway-first expiry already makes the boundary safe; this just
    /// avoids pointless gateway calls for sessions expiring right now.
    public int GracePeriodMinutes { get; init; } = 2;

    public int BatchSize { get; init; } = 50;
}