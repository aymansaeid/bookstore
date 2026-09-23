using BookStore.Domain.Common;

namespace BookStore.Domain.Notifications;

public sealed class StockNotification : AggregateRoot<int>
{
    public int BookId { get; private set; }
    public string Email { get; private set; } = string.Empty;

    /// Only hashed. The plaintext goes out in the email link and is never
    /// stored, same pattern as verification and reset tokens.
    public string ConfirmationTokenHash { get; private set; } = string.Empty;

    public bool IsConfirmed { get; private set; }
    public DateTimeOffset? ConfirmedAtUtc { get; private set; }
    public DateTimeOffset? NotifiedAtUtc { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    public bool IsAwaitingNotification => IsConfirmed && NotifiedAtUtc is null;

    private StockNotification() { } // EF Core

    public static StockNotification Create(int bookId, string email, string confirmationTokenHash)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new ArgumentException("A valid email is required.", nameof(email));

        return new StockNotification
        {
            BookId = bookId,
            Email = email.Trim().ToLowerInvariant(),
            ConfirmationTokenHash = confirmationTokenHash,
            IsConfirmed = false,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };
    }

    public void Confirm()
    {
        if (IsConfirmed)
            return; // Idempotent: clicking the link twice is fine.

        IsConfirmed = true;
        ConfirmedAtUtc = DateTimeOffset.UtcNow;
    }

    /// Marked BEFORE the email is sent (decision #4). A missed notification
    /// is a far smaller problem than mailing the whole waiting list twice.
    public void MarkNotified() => NotifiedAtUtc = DateTimeOffset.UtcNow;

    /// Lets someone re-subscribe after a previous notification: clears the
    /// notified stamp and issues a fresh confirmation requirement.
    public void Resubscribe(string newConfirmationTokenHash)
    {
        ConfirmationTokenHash = newConfirmationTokenHash;
        IsConfirmed = false;
        ConfirmedAtUtc = null;
        NotifiedAtUtc = null;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }
}