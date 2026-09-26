using BookStore.Application.Common;
using BookStore.Domain.Books;
using BookStore.Domain.Reviews;

namespace BookStore.Application.Reviews;

public enum ReviewSort
{
    Newest = 0,
    HighestRated = 1,
    LowestRated = 2
}

/// Compact rating for catalog listings.
public sealed record RatingSnapshot(decimal? AverageRating, int ReviewCount);

/// Full rating for a book page, including the 5-to-1 star breakdown.
public sealed record RatingSummaryDto(decimal? AverageRating, int ReviewCount, IReadOnlyDictionary<int, int> Distribution);

public sealed record PublicReviewDto(
    int Id, string AuthorDisplayName, int Rating, string? Title, string Body,
    DateTimeOffset CreatedAtUtc, DateTimeOffset? UpdatedAtUtc);

public sealed record BookReviewsDto(RatingSummaryDto Summary, PagedResult<PublicReviewDto> Reviews);

public sealed record MyReviewDto(
    int Id, int BookId, string BookTitle, string BookSlug, int Rating, string? Title, string Body,
    ReviewStatus Status, DateTimeOffset CreatedAtUtc, DateTimeOffset? UpdatedAtUtc);

public sealed record AdminReviewDto(
    int Id, int BookId, string BookTitle, int CustomerId, string AuthorDisplayName,
    int Rating, string? Title, string Body, ReviewStatus Status,
    string? ModerationNote, int? ModeratedByAdminId, DateTimeOffset? ModeratedAtUtc,
    DateTimeOffset CreatedAtUtc, DateTimeOffset? UpdatedAtUtc);

/// Reason codes: "AlreadyReviewed" (ExistingReviewId set, so the frontend
/// shows "Edit your review"), or "NoEligiblePurchase".
public sealed record ReviewEligibilityDto(bool CanReview, int? ExistingReviewId, string? Reason);

public static class ReviewMappings
{
    public static MyReviewDto ToMyDto(this Review r, Book book) =>
        new(r.Id, r.BookId, book.Title, book.Slug.Value, r.Rating, r.Title, r.Body,
            r.Status, r.CreatedAtUtc, r.UpdatedAtUtc);

    public static AdminReviewDto ToAdminDto(this Review r, string bookTitle) =>
        new(r.Id, r.BookId, bookTitle, r.CustomerId, r.AuthorDisplayName, r.Rating, r.Title, r.Body,
            r.Status, r.ModerationNote, r.ModeratedByAdminId, r.ModeratedAtUtc, r.CreatedAtUtc, r.UpdatedAtUtc);
}