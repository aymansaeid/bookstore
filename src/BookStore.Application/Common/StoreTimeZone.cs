using System.Globalization;

namespace BookStore.Application.Common;

/// Converts between UTC (what the database stores) and the store's local
/// calendar (what the owner and accountant think in).
public sealed class StoreTimeZone(string timeZoneId)
{
    private readonly TimeZoneInfo _zone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);

    public DateOnly Today => ToLocalDate(DateTimeOffset.UtcNow);

    public DateOnly ToLocalDate(DateTimeOffset utc) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(utc, _zone).DateTime);

    public DateTimeOffset StartOfDayUtc(DateOnly date)
    {
        var localMidnight = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        return new DateTimeOffset(localMidnight, _zone.GetUtcOffset(localMidnight)).ToUniversalTime();
    }

    /// Inclusive local dates -> half-open UTC range [from 00:00, to+1 00:00).
    public (DateTimeOffset FromUtc, DateTimeOffset ToUtcExclusive) ToUtcRange(DateOnly from, DateOnly to) =>
        (StartOfDayUtc(from), StartOfDayUtc(to.AddDays(1)));

    public string FormatLocal(DateTimeOffset utc) =>
        TimeZoneInfo.ConvertTime(utc, _zone).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
}