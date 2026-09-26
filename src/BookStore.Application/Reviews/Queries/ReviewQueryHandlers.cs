using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Reviews.Queries;
using BookStore.Application.Common;
using BookStore.Domain.Reviews;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Reviews.Queries;

public sealed record GetBookReviewsQuery(int BookId, ReviewSort Sort, int Page = 1, int PageSize = 10)
    : IQuery<BookReviewsDto>;

public sealed class GetBookReviewsQueryValidator : AbstractValidator<GetBookReviewsQuery>
{
    public GetBookReviewsQueryValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.Sort).IsInEnum();
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 50);
    }
}

public sealed class GetBookReviewsQueryHandler(IBookRepository bookRepository, IReviewQueries reviewQueries)
    : IQueryHandler<GetBookReviewsQuery, BookReviewsDto>
{
    public async Task<Result<BookReviewsDto>> Handle(GetBookReviewsQuery query, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(query.BookId, ct);
        if (book is null || !book.IsActive)
            return Result.Failure<BookReviewsDto>(ReviewErrors.BookNotFound);

        var summary = await reviewQueries.GetRatingSummaryAsync(book.Id, ct);
        var reviews = await reviewQueries.ListApprovedAsync(book.Id, query.Sort, query.Page, query.PageSize, ct);

        return Result.Success(new BookReviewsDto(summary, reviews));
    }
}

public sealed record GetMyReviewsQuery(int CustomerId) : IQuery<IReadOnlyList<MyReviewDto>>;

public sealed class GetMyReviewsQueryHandler(IReviewQueries reviewQueries)
    : IQueryHandler<GetMyReviewsQuery, IReadOnlyList<MyReviewDto>>
{
    public async Task<Result<IReadOnlyList<MyReviewDto>>> Handle(GetMyReviewsQuery query, CancellationToken ct) =>
        Result.Success(await reviewQueries.ListByCustomerAsync(query.CustomerId, ct));
}

public sealed record GetReviewEligibilityQuery(int CustomerId, int BookId) : IQuery<ReviewEligibilityDto>;

public sealed class GetReviewEligibilityQueryHandler(
    IReviewRepository reviewRepository,
    IOrderRepository orderRepository,
    IOptions<ReviewOptions> reviewOptions)
    : IQueryHandler<GetReviewEligibilityQuery, ReviewEligibilityDto>
{
    public async Task<Result<ReviewEligibilityDto>> Handle(GetReviewEligibilityQuery query, CancellationToken ct) =>
        Result.Success(await ReviewRules.CheckAsync(
            reviewRepository, orderRepository, reviewOptions.Value, query.CustomerId, query.BookId, ct));
}

public sealed record ListReviewsForModerationQuery(ReviewStatus? Status, int? BookId, int Page = 1, int PageSize = 20)
    : IQuery<PagedResult<AdminReviewDto>>;

public sealed class ListReviewsForModerationQueryValidator : AbstractValidator<ListReviewsForModerationQuery>
{
    public ListReviewsForModerationQueryValidator()
    {
        RuleFor(x => x.Status).IsInEnum().When(x => x.Status.HasValue);
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
    }
}

public sealed class ListReviewsForModerationQueryHandler(IReviewQueries reviewQueries)
    : IQueryHandler<ListReviewsForModerationQuery, PagedResult<AdminReviewDto>>
{
    public async Task<Result<PagedResult<AdminReviewDto>>> Handle(
        ListReviewsForModerationQuery query, CancellationToken ct) =>
        Result.Success(await reviewQueries.ListForModerationAsync(
            new ReviewModerationFilter(query.Status, query.BookId, query.Page, query.PageSize), ct));
}