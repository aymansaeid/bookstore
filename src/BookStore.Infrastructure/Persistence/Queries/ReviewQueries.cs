using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Reviews.Queries;
using BookStore.Application.Common;
using BookStore.Application.Reviews;
using BookStore.Domain.Reviews;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Queries;

public sealed class ReviewQueries(BookStoreDbContext dbContext) : IReviewQueries
{
    public async Task<RatingSummaryDto> GetRatingSummaryAsync(int bookId, CancellationToken ct = default)
    {
        var counts = await dbContext.Reviews
            .AsNoTracking()
            .Where(r => r.BookId == bookId && r.Status == ReviewStatus.Approved)
            .GroupBy(r => r.Rating)
            .Select(g => new { Rating = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var total = counts.Sum(c => c.Count);

        // Every star level present, zeros included, so the frontend's
        // 5-bar breakdown never has to fill gaps.
        var distribution = Enumerable.Range(1, 5)
            .ToDictionary(star => star, star => counts.FirstOrDefault(c => c.Rating == star)?.Count ?? 0);

        decimal? average = total == 0
            ? null
            : Math.Round((decimal)counts.Sum(c => c.Rating * c.Count) / total, 1, MidpointRounding.AwayFromZero);

        return new RatingSummaryDto(average, total, distribution);
    }

    public async Task<IReadOnlyDictionary<int, RatingSnapshot>> GetRatingSnapshotsAsync(
        IReadOnlyCollection<int> bookIds, CancellationToken ct = default)
    {
        if (bookIds.Count == 0)
            return new Dictionary<int, RatingSnapshot>();

        var rows = await dbContext.Reviews
            .AsNoTracking()
            .Where(r => bookIds.Contains(r.BookId) && r.Status == ReviewStatus.Approved)
            .GroupBy(r => r.BookId)
            .Select(g => new { BookId = g.Key, Count = g.Count(), Sum = g.Sum(r => r.Rating) })
            .ToListAsync(ct);

        return rows.ToDictionary(
            x => x.BookId,
            x => new RatingSnapshot(
                Math.Round((decimal)x.Sum / x.Count, 1, MidpointRounding.AwayFromZero), x.Count));
    }

    public async Task<PagedResult<PublicReviewDto>> ListApprovedAsync(
        int bookId, ReviewSort sort, int page, int pageSize, CancellationToken ct = default)
    {
        IQueryable<Review> query = dbContext.Reviews
            .AsNoTracking()
            .Where(r => r.BookId == bookId && r.Status == ReviewStatus.Approved);

        var total = await query.CountAsync(ct);

        query = sort switch
        {
            ReviewSort.HighestRated => query.OrderByDescending(r => r.Rating).ThenByDescending(r => r.CreatedAtUtc),
            ReviewSort.LowestRated => query.OrderBy(r => r.Rating).ThenByDescending(r => r.CreatedAtUtc),
            _ => query.OrderByDescending(r => r.CreatedAtUtc)
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new PublicReviewDto(
                r.Id, r.AuthorDisplayName, r.Rating, r.Title, r.Body, r.CreatedAtUtc, r.UpdatedAtUtc))
            .ToListAsync(ct);

        return new PagedResult<PublicReviewDto>(items, page, pageSize, total);
    }

    public async Task<IReadOnlyList<MyReviewDto>> ListByCustomerAsync(int customerId, CancellationToken ct = default)
    {
        // Project the Slug value object whole and unwrap it in memory: EF
        // can't translate a member access on a value-converted property.
        var rows = await (
                from r in dbContext.Reviews.AsNoTracking()
                join b in dbContext.Books.AsNoTracking() on r.BookId equals b.Id
                where r.CustomerId == customerId
                orderby r.CreatedAtUtc descending
                select new { Review = r, b.Title, b.Slug })
            .ToListAsync(ct);

        return rows.Select(x => new MyReviewDto(
                x.Review.Id, x.Review.BookId, x.Title, x.Slug.Value, x.Review.Rating, x.Review.Title,
                x.Review.Body, x.Review.Status, x.Review.CreatedAtUtc, x.Review.UpdatedAtUtc))
            .ToList();
    }

    public async Task<PagedResult<AdminReviewDto>> ListForModerationAsync(
        ReviewModerationFilter filter, CancellationToken ct = default)
    {
        var query =
            from r in dbContext.Reviews.AsNoTracking()
            join b in dbContext.Books.AsNoTracking() on r.BookId equals b.Id
            select new { Review = r, BookTitle = b.Title };

        if (filter.Status is { } status)
            query = query.Where(x => x.Review.Status == status);
        if (filter.BookId is { } bookId)
            query = query.Where(x => x.Review.BookId == bookId);

        var total = await query.CountAsync(ct);

        // Oldest first: the moderation queue should be worked in arrival order.
        var rows = await query
            .OrderBy(x => x.Review.CreatedAtUtc)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(ct);

        return new PagedResult<AdminReviewDto>(
            rows.Select(x => x.Review.ToAdminDto(x.BookTitle)).ToList(),
            filter.Page, filter.PageSize, total);
    }
}