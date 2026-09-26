using BookStore.Domain.Reviews;
using FluentAssertions;

namespace BookStore.Domain.Tests.Reviews;

public class ReviewTests
{
    private static Review CreateReview() =>
        Review.Create(1, 1, "Ayşe K.", 5, "Loved it", "A wonderful read from start to finish.");

    [Fact]
    public void NewReview_StartsPending()
    {
        CreateReview().Status.Should().Be(ReviewStatus.Pending);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void Create_RejectsOutOfRangeRating(int rating)
    {
        var act = () => Review.Create(1, 1, "Ayşe K.", rating, null, "A wonderful read from start to finish.");
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_RejectsTooShortBody()
    {
        var act = () => Review.Create(1, 1, "Ayşe K.", 4, null, "Nice.");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Edit_SendsApprovedReviewBackToModeration()
    {
        var review = CreateReview();
        review.Approve(adminUserId: 1);

        review.Edit("Ayşe K.", 1, "Changed my mind", "Visit my-totally-legit-site dot com today.");

        review.Status.Should().Be(ReviewStatus.Pending);
        review.ModeratedByAdminId.Should().BeNull();
        review.UpdatedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public void Reject_RequiresNote()
    {
        var act = () => CreateReview().Reject(1, " ");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Approve_AfterReject_ClearsNote()
    {
        var review = CreateReview();
        review.Reject(1, "Looked like spam");

        review.Approve(1);

        review.Status.Should().Be(ReviewStatus.Approved);
        review.ModerationNote.Should().BeNull();
    }
}