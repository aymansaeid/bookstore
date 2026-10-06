using BookStore.Domain.Common;

namespace BookStore.Domain.Library;

public enum ReadingStatus
{
    NotStarted = 0,
    Reading = 1,
    Finished = 2
}

/// What the orders can't know about a book on a customer's shelf: that they
/// own it from elsewhere, and how far they've read. Purchases themselves are
/// never stored here; they're calculated from orders.
public sealed class LibraryEntry : AggregateRoot<int>
{
    public int CustomerId { get; private set; }
    public int BookId { get; private set; }

    /// "I already own this" for books bought elsewhere. Also what keeps the
    /// AI from recommending them later.
    public bool IsManuallyOwned { get; private set; }

    public ReadingStatus ReadingStatus { get; private set; }
    public int ProgressPercent { get; private set; }
    public DateTimeOffset? StartedAtUtc { get; private set; }
    public DateTimeOffset? FinishedAtUtc { get; private set; }
    public DateTimeOffset UpdatedAtUtc { get; private set; }

    /// An entry with no manual ownership and no progress carries no
    /// information and can be deleted.
    public bool IsEmpty => !IsManuallyOwned && ReadingStatus == ReadingStatus.NotStarted;

    private LibraryEntry() { } // EF Core

    public static LibraryEntry Create(int customerId, int bookId) =>
        new()
        {
            CustomerId = customerId,
            BookId = bookId,
            ReadingStatus = ReadingStatus.NotStarted,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };

    public void MarkOwnedManually()
    {
        IsManuallyOwned = true;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    public void ClearManualOwnership()
    {
        IsManuallyOwned = false;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    public void UpdateProgress(ReadingStatus status, int percent)
    {
        if (percent is < 0 or > 100)
            throw new ArgumentOutOfRangeException(nameof(percent), "Progress must be between 0 and 100.");

        var now = DateTimeOffset.UtcNow;

        // 100% is finished, whatever status was sent.
        if (status == ReadingStatus.Finished || percent == 100)
        {
            ReadingStatus = ReadingStatus.Finished;
            ProgressPercent = 100;
            StartedAtUtc ??= now;
            FinishedAtUtc ??= now;
        }
        else if (status == ReadingStatus.Reading)
        {
            ReadingStatus = ReadingStatus.Reading;
            ProgressPercent = percent;
            StartedAtUtc ??= now;
            FinishedAtUtc = null; // re-reading a finished book
        }
        else
        {
            ReadingStatus = ReadingStatus.NotStarted;
            ProgressPercent = 0;
            StartedAtUtc = null;
            FinishedAtUtc = null;
        }

        UpdatedAtUtc = now;
    }
}