using BookStore.Application.Common;
using BookStore.Application.Reviews;
using BookStore.Domain.Reviews;

namespace BookStore.Application.Abstractions.Reviews.Queries;

public sealed record ReviewModerationFilter(ReviewStatus? Status, int? BookId, int Page, int PageSize);

public interface IReviewQueries
{
    Task<RatingSummaryDto> GetRatingSummaryAsync(int bookId, CancellationToken ct = default);

    Task<IReadOnlyDictionary<int, RatingSnapshot>> GetRatingSnapshotsAsync(
        IReadOnlyCollection<int> bookIds, CancellationToken ct = default);

    Task<PagedResult<PublicReviewDto>> ListApprovedAsync(
        int bookId, ReviewSort sort, int page, int pageSize, CancellationToken ct = default);

    Task<IReadOnlyList<MyReviewDto>> ListByCustomerAsync(int customerId, CancellationToken ct = default);

    Task<PagedResult<AdminReviewDto>> ListForModerationAsync(ReviewModerationFilter filter, CancellationToken ct = default);
}