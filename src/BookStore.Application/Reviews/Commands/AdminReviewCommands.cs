using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using FluentValidation;

namespace BookStore.Application.Reviews.Commands;

public sealed record ApproveReviewCommand(int ReviewId) : ICommand<AdminReviewDto>, IAuditableCommand
{
    public string AuditEntityType => "Review";
    public string? AuditEntityId => ReviewId.ToString();
}

public sealed record RejectReviewCommand(int ReviewId, string Note) : ICommand<AdminReviewDto>, IAuditableCommand
{
    public string AuditEntityType => "Review";
    public string? AuditEntityId => ReviewId.ToString();
}

public sealed class RejectReviewCommandValidator : AbstractValidator<RejectReviewCommand>
{
    public RejectReviewCommandValidator()
    {
        RuleFor(x => x.ReviewId).GreaterThan(0);
        RuleFor(x => x.Note)
            .NotEmpty().WithMessage("Add an internal note explaining the rejection.")
            .MaximumLength(500);
    }
}

public sealed class ApproveReviewCommandHandler(
    IReviewRepository reviewRepository,
    IBookRepository bookRepository,
    ICurrentActor currentActor,
    IUnitOfWork unitOfWork)
    : ICommandHandler<ApproveReviewCommand, AdminReviewDto>
{
    public async Task<Result<AdminReviewDto>> Handle(ApproveReviewCommand command, CancellationToken ct)
    {
        var review = await reviewRepository.GetByIdAsync(command.ReviewId, ct);
        if (review is null)
            return Result.Failure<AdminReviewDto>(ReviewErrors.NotFound(command.ReviewId));

        review.Approve(currentActor.AdminUserId);
        await unitOfWork.SaveChangesAsync(ct);

        var book = await bookRepository.GetByIdAsync(review.BookId, ct);
        return Result.Success(review.ToAdminDto(book?.Title ?? "(deleted book)"));
    }
}

public sealed class RejectReviewCommandHandler(
    IReviewRepository reviewRepository,
    IBookRepository bookRepository,
    ICurrentActor currentActor,
    IUnitOfWork unitOfWork)
    : ICommandHandler<RejectReviewCommand, AdminReviewDto>
{
    public async Task<Result<AdminReviewDto>> Handle(RejectReviewCommand command, CancellationToken ct)
    {
        var review = await reviewRepository.GetByIdAsync(command.ReviewId, ct);
        if (review is null)
            return Result.Failure<AdminReviewDto>(ReviewErrors.NotFound(command.ReviewId));

        review.Reject(currentActor.AdminUserId, command.Note);
        await unitOfWork.SaveChangesAsync(ct);

        var book = await bookRepository.GetByIdAsync(review.BookId, ct);
        return Result.Success(review.ToAdminDto(book?.Title ?? "(deleted book)"));
    }
}