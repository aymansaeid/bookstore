using BookStore.Domain.Common;

namespace BookStore.Domain.Reviews;

public enum ReviewStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

public sealed class Review : AggregateRoot<int>
{
    public const int MinBodyLength = 10;
    public const int MaxBodyLength = 2000;
    public const int MaxTitleLength = 120;

    public int BookId { get; private set; }
    public int CustomerId { get; private set; }

    /// "Ayşe K." — snapshotted, refreshed on edit. Never the full surname.
    public string AuthorDisplayName { get; private set; } = string.Empty;

    public int Rating { get; private set; }
    public string? Title { get; private set; }
    public string Body { get; private set; } = string.Empty;

    public ReviewStatus Status { get; private set; }

    /// Internal only. The customer sees the status, never this text.
    public string? ModerationNote { get; private set; }
    public int? ModeratedByAdminId { get; private set; }
    public DateTimeOffset? ModeratedAtUtc { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? UpdatedAtUtc { get; private set; }

    private Review() { } // EF Core

    public static Review Create(
        int bookId, int customerId, string authorDisplayName, int rating, string? title, string body)
    {
        if (string.IsNullOrWhiteSpace(authorDisplayName))
            throw new ArgumentException("Author display name is required.", nameof(authorDisplayName));

        var review = new Review
        {
            BookId = bookId,
            CustomerId = customerId,
            AuthorDisplayName = authorDisplayName.Trim(),
            Status = ReviewStatus.Pending,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        review.SetContent(rating, title, body);
        return review;
    }

    /// Any edit sends the review back to moderation. Otherwise an approved
    /// harmless review could be edited into spam and stay published.
    public void Edit(string authorDisplayName, int rating, string? title, string body)
    {
        SetContent(rating, title, body);

        AuthorDisplayName = authorDisplayName.Trim();
        Status = ReviewStatus.Pending;
        ModerationNote = null;
        ModeratedByAdminId = null;
        ModeratedAtUtc = null;
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    /// Works from Pending or Rejected: an admin can change their mind.
    public void Approve(int? adminUserId)
    {
        Status = ReviewStatus.Approved;
        ModerationNote = null;
        ModeratedByAdminId = adminUserId;
        ModeratedAtUtc = DateTimeOffset.UtcNow;
    }

    /// Works from Pending or Approved: rejecting an approved review
    /// unpublishes it.
    public void Reject(int? adminUserId, string note)
    {
        if (string.IsNullOrWhiteSpace(note))
            throw new ArgumentException("A rejection needs an internal note.", nameof(note));

        Status = ReviewStatus.Rejected;
        ModerationNote = note.Trim();
        ModeratedByAdminId = adminUserId;
        ModeratedAtUtc = DateTimeOffset.UtcNow;
    }

    private void SetContent(int rating, string? title, string body)
    {
        if (rating is < 1 or > 5)
            throw new ArgumentOutOfRangeException(nameof(rating), "Rating must be between 1 and 5.");

        var trimmedBody = body?.Trim() ?? string.Empty;
        if (trimmedBody.Length is < MinBodyLength or > MaxBodyLength)
            throw new ArgumentException(
                $"Review text must be between {MinBodyLength} and {MaxBodyLength} characters.", nameof(body));

        var trimmedTitle = string.IsNullOrWhiteSpace(title) ? null : title.Trim();
        if (trimmedTitle is { Length: > MaxTitleLength })
            throw new ArgumentException($"Title can be at most {MaxTitleLength} characters.", nameof(title));

        Rating = rating;
        Title = trimmedTitle;
        Body = trimmedBody;
    }
}