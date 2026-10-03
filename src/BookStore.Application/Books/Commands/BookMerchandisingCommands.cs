using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using BookStore.Domain.Books;
using FluentValidation;

namespace BookStore.Application.Books.Commands;

public sealed record SetBookMerchandisingCommand(
    int BookId,
    ReaderLevel? Level,
    int? Volumes,
    decimal? CompareAtPrice,
    bool InstallmentsAllowed,
    IReadOnlyList<string>? Highlights,
    IReadOnlyList<BookBadges>? Badges,
    string? EditionLabel) : ICommand<AdminBookDto>, IAuditableCommand
{
    public string AuditEntityType => "Book";
    public string? AuditEntityId => BookId.ToString();
}

public sealed class SetBookMerchandisingCommandValidator : AbstractValidator<SetBookMerchandisingCommand>
{
    public SetBookMerchandisingCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.Level).IsInEnum().When(x => x.Level.HasValue);
        RuleFor(x => x.Volumes).InclusiveBetween(1, Book.MaxVolumes).When(x => x.Volumes.HasValue);
        RuleFor(x => x.CompareAtPrice).GreaterThan(0).PrecisionScale(18, 2, ignoreTrailingZeros: true)
            .When(x => x.CompareAtPrice.HasValue);
        RuleFor(x => x.Highlights!.Count).LessThanOrEqualTo(Book.MaxHighlights).When(x => x.Highlights is not null);
        RuleForEach(x => x.Highlights).MaximumLength(Book.MaxHighlightLength);

        // Each entry must be exactly one real badge: "New", "Deluxe", "Bestseller".
        RuleForEach(x => x.Badges)
            .Must(b => b != BookBadges.None && Enum.IsDefined(b))
            .WithMessage("Unknown badge. Use New, Deluxe or Bestseller.");

        RuleFor(x => x.EditionLabel).MaximumLength(Book.MaxEditionLabelLength);
    }
}

public sealed class SetBookMerchandisingCommandHandler(
    IBookRepository bookRepository, IUnitOfWork unitOfWork, IFileStorage fileStorage)
    : ICommandHandler<SetBookMerchandisingCommand, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(SetBookMerchandisingCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure<AdminBookDto>(BookErrors.NotFound(command.BookId));

        // Checked here (not only in the domain) so the admin gets a clean 400
        // instead of an exception: it depends on the CURRENT price.
        if (command.CompareAtPrice is { } was && was <= book.Price.Amount)
            return Result.Failure<AdminBookDto>(BookErrors.OldPriceNotHigher);

        var badges = (command.Badges ?? []).Aggregate(BookBadges.None, (all, badge) => all | badge);

        book.SetMerchandising(
            command.Level, command.Volumes, command.CompareAtPrice, command.InstallmentsAllowed,
            command.Highlights ?? [], badges, command.EditionLabel);

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(book.ToAdminDto(fileStorage));
    }
}

public sealed record SetRelatedBooksCommand(int BookId, IReadOnlyList<int> RelatedBookIds)
    : ICommand<AdminBookDto>, IAuditableCommand
{
    public string AuditEntityType => "Book";
    public string? AuditEntityId => BookId.ToString();
}

public sealed class SetRelatedBooksCommandValidator : AbstractValidator<SetRelatedBooksCommand>
{
    public SetRelatedBooksCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.RelatedBookIds).NotNull();
        RuleFor(x => x.RelatedBookIds.Count).LessThanOrEqualTo(Book.MaxRelatedBooks);
        RuleFor(x => x.RelatedBookIds)
            .Must(ids => ids.Distinct().Count() == ids.Count)
            .WithMessage("Each related book can appear only once.");
    }
}

public sealed class SetRelatedBooksCommandHandler(
    IBookRepository bookRepository, IUnitOfWork unitOfWork, IFileStorage fileStorage)
    : ICommandHandler<SetRelatedBooksCommand, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(SetRelatedBooksCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure<AdminBookDto>(BookErrors.NotFound(command.BookId));

        if (command.RelatedBookIds.Contains(book.Id))
            return Result.Failure<AdminBookDto>(BookErrors.CannotRelateToItself);

        // No foreign key on related ids (an owned row pointing back at its
        // own owner's table is something EF handles poorly), so existence is
        // checked here. Books are never deleted, so links can't dangle later.
        if (command.RelatedBookIds.Count > 0)
        {
            var found = await bookRepository.ListByIdsAsync(command.RelatedBookIds, ct);
            var missing = command.RelatedBookIds.Except(found.Select(b => b.Id)).ToList();
            if (missing.Count > 0)
                return Result.Failure<AdminBookDto>(BookErrors.UnknownBooks(missing));
        }

        book.SetRelatedBooks(command.RelatedBookIds);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(book.ToAdminDto(fileStorage));
    }
}

/// Sets the full list of OTHER editions of this book. Send an empty list to
/// remove the book from its edition group.
public sealed record SetBookEditionsCommand(int BookId, IReadOnlyList<int> OtherEditionBookIds)
    : ICommand<AdminBookDto>, IAuditableCommand
{
    public string AuditEntityType => "Book";
    public string? AuditEntityId => BookId.ToString();
}

public sealed class SetBookEditionsCommandValidator : AbstractValidator<SetBookEditionsCommand>
{
    public SetBookEditionsCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.OtherEditionBookIds).NotNull();
        RuleFor(x => x.OtherEditionBookIds.Count).LessThanOrEqualTo(20);
        RuleFor(x => x.OtherEditionBookIds)
            .Must(ids => ids.Distinct().Count() == ids.Count)
            .WithMessage("Each edition can appear only once.");
    }
}

public sealed class SetBookEditionsCommandHandler(
    IBookRepository bookRepository, IUnitOfWork unitOfWork, IFileStorage fileStorage)
    : ICommandHandler<SetBookEditionsCommand, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(SetBookEditionsCommand command, CancellationToken ct)
    {
        if (command.OtherEditionBookIds.Contains(command.BookId))
            return Result.Failure<AdminBookDto>(BookErrors.CannotRelateToItself);

        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure<AdminBookDto>(BookErrors.NotFound(command.BookId));

        var others = await bookRepository.ListForUpdateAsync(command.OtherEditionBookIds, ct);
        var missing = command.OtherEditionBookIds.Except(others.Select(b => b.Id)).ToList();
        if (missing.Count > 0)
            return Result.Failure<AdminBookDto>(BookErrors.UnknownBooks(missing));

        // Refuse to silently merge two different works' groups.
        var foreign = others.FirstOrDefault(o => o.EditionGroupId is not null && o.EditionGroupId != book.EditionGroupId);
        if (foreign is not null)
            return Result.Failure<AdminBookDto>(BookErrors.AlreadyInAnotherEditionGroup(foreign.Id));

        var currentMembers = book.EditionGroupId is { } oldGroupId
            ? await bookRepository.ListEditionGroupAsync(oldGroupId, forUpdate: true, ct)
            : [];

        var newMemberIds = command.OtherEditionBookIds.Append(book.Id).ToHashSet();

        // Everyone in the old group but not in the new list leaves it.
        foreach (var member in currentMembers.Where(m => !newMemberIds.Contains(m.Id)))
            member.LeaveEditionGroup();

        if (newMemberIds.Count == 1)
        {
            // An "edition group" of one book is meaningless.
            book.LeaveEditionGroup();
        }
        else
        {
            // Smallest id = stable, deterministic group id; no extra table.
            var groupId = newMemberIds.Min();
            book.JoinEditionGroup(groupId);
            foreach (var other in others)
                other.JoinEditionGroup(groupId);
        }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(book.ToAdminDto(fileStorage));
    }
}