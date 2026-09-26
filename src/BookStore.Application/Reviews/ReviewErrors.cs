using BookStore.Application.Common;

namespace BookStore.Application.Reviews;

public static class ReviewErrors
{
    public static Error NotFound(int id) =>
        Error.NotFound("Review.NotFound", $"Review {id} was not found.");

    public static Error BookNotFound =>
        Error.NotFound("Review.BookNotFound", "That book was not found.");

    public static Error AlreadyReviewed(int existingReviewId) =>
        Error.Conflict("Review.AlreadyReviewed",
            $"You've already reviewed this book (review {existingReviewId}). Edit it instead.");

    public static Error NotEligible =>
        Error.Forbidden("Review.NotEligible",
            "You can review a book once your order containing it has been delivered.");
}