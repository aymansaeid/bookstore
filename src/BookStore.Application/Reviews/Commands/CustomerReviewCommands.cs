using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Customers;
using BookStore.Domain.Reviews;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Reviews.Commands;

public sealed record SubmitReviewCommand(int CustomerId, int BookId, int Rating, string? Title, string Body)
    : ICommand<MyReviewDto>;

public sealed record UpdateMyReviewCommand(int CustomerId, int ReviewId, int Rating, string? Title, string Body)
    : ICommand<MyReviewDto>;

public sealed record DeleteMyReviewCommand(int CustomerId, int ReviewId) : ICommand;

public sealed class SubmitReviewCommandValidator : AbstractValidator<SubmitReviewCommand>
{
    public SubmitReviewCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.Rating).InclusiveBetween(1, 5);
        RuleFor(x => x.Title).MaximumLength(Review.MaxTitleLength);
        RuleFor(x => x.Body).NotEmpty().Length(Review.MinBodyLength, Review.MaxBodyLength);
    }
}

public sealed class UpdateMyReviewCommandValidator : AbstractValidator<UpdateMyReviewCommand>
{
    public UpdateMyReviewCommandValidator()
    {
        RuleFor(x => x.ReviewId).GreaterThan(0);
        RuleFor(x => x.Rating).InclusiveBetween(1, 5);
        RuleFor(x => x.Title).MaximumLength(Review.MaxTitleLength);
        RuleFor(x => x.Body).NotEmpty().Length(Review.MinBodyLength, Review.MaxBodyLength);
    }
}

public sealed class SubmitReviewCommandHandler(
    ICustomerRepository customerRepository,
    IBookRepository bookRepository,
    IReviewRepository reviewRepository,
    IOrderRepository orderRepository,
    IUnitOfWork unitOfWork,
    IOptions<ReviewOptions> reviewOptions)
    : ICommandHandler<SubmitReviewCommand, MyReviewDto>
{
    public async Task<Result<MyReviewDto>> Handle(SubmitReviewCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null || !customer.IsActive)
            return Result.Failure<MyReviewDto>(CustomerErrors.AccountUnavailable);

        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null || !book.IsActive)
            return Result.Failure<MyReviewDto>(ReviewErrors.BookNotFound);

        var eligibility = await ReviewRules.CheckAsync(
            reviewRepository, orderRepository, reviewOptions.Value, customer.Id, book.Id, ct);

        if (!eligibility.CanReview)
            return Result.Failure<MyReviewDto>(eligibility.ExistingReviewId is { } existingId
                ? ReviewErrors.AlreadyReviewed(existingId)
                : ReviewErrors.NotEligible);

        var review = Review.Create(
            book.Id, customer.Id, customer.PublicDisplayName, command.Rating, command.Title, command.Body);

        reviewRepository.Add(review);

        // A double-click that races past the check above hits the unique
        // (CustomerId, BookId) index and becomes a 409 via DuplicateEntryException.
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(review.ToMyDto(book));
    }
}

public sealed class UpdateMyReviewCommandHandler(
    ICustomerRepository customerRepository,
    IBookRepository bookRepository,
    IReviewRepository reviewRepository,
    IUnitOfWork unitOfWork)
    : ICommandHandler<UpdateMyReviewCommand, MyReviewDto>
{
    public async Task<Result<MyReviewDto>> Handle(UpdateMyReviewCommand command, CancellationToken ct)
    {
        var review = await reviewRepository.GetByIdAsync(command.ReviewId, ct);

        // Someone else's review looks exactly like a missing one: no
        // confirmation that review 57 exists and belongs to another person.
        if (review is null || review.CustomerId != command.CustomerId)
            return Result.Failure<MyReviewDto>(ReviewErrors.NotFound(command.ReviewId));

        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null || !customer.IsActive)
            return Result.Failure<MyReviewDto>(CustomerErrors.AccountUnavailable);

        var book = await bookRepository.GetByIdAsync(review.BookId, ct);
        if (book is null)
            return Result.Failure<MyReviewDto>(ReviewErrors.BookNotFound);

        review.Edit(customer.PublicDisplayName, command.Rating, command.Title, command.Body);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(review.ToMyDto(book));
    }
}

public sealed class DeleteMyReviewCommandHandler(IReviewRepository reviewRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteMyReviewCommand>
{
    public async Task<Result> Handle(DeleteMyReviewCommand command, CancellationToken ct)
    {
        var review = await reviewRepository.GetByIdAsync(command.ReviewId, ct);
        if (review is null || review.CustomerId != command.CustomerId)
            return Result.Failure(ReviewErrors.NotFound(command.ReviewId));

        reviewRepository.Remove(review);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}