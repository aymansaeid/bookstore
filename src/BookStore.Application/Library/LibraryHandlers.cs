using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Books;
using BookStore.Application.Common;
using BookStore.Domain.Library;
using FluentValidation;

namespace BookStore.Application.Library;

public sealed record GetLibraryQuery(int CustomerId) : IQuery<LibraryDto>;

public sealed class GetLibraryQueryHandler(
    LibraryReader libraryReader, IBookRepository bookRepository, IFileStorage fileStorage)
    : IQueryHandler<GetLibraryQuery, LibraryDto>
{
    public async Task<Result<LibraryDto>> Handle(GetLibraryQuery query, CancellationToken ct)
    {
        var (owned, entries) = await libraryReader.LoadAsync(query.CustomerId, ct);
        if (owned.Count == 0)
            return Result.Success(new LibraryDto([], new LibraryStatsDto(0, 0, 0, 0, 0, 0, 0), null));

        // Hidden books stay on the shelf: you still own them.
        var books = (await bookRepository.ListByIdsAsync(owned.Keys.ToList(), ct)).ToDictionary(b => b.Id);
        var entriesByBook = entries.ToDictionary(e => e.BookId);

        var items = owned
            .Where(kv => books.ContainsKey(kv.Key))
            .Select(kv =>
            {
                var entry = entriesByBook.GetValueOrDefault(kv.Key);
                return new LibraryItemDto(
                    books[kv.Key].ToSummaryDto(fileStorage, rating: null),
                    kv.Value.Ownership,
                    entry?.ReadingStatus ?? ReadingStatus.NotStarted,
                    entry?.ProgressPercent ?? 0,
                    kv.Value.AcquiredAtUtc,
                    entry?.ReadingStatus == ReadingStatus.NotStarted ? null : entry?.UpdatedAtUtc);
            })
            // Being read first (most recent on top), then newest acquisitions.
            .OrderByDescending(i => i.ReadingStatus == ReadingStatus.Reading)
            .ThenByDescending(i => i.LastReadAtUtc)
            .ThenByDescending(i => i.AcquiredAtUtc)
            .ToList();

        var year = DateTimeOffset.UtcNow.Year;
        var stats = new LibraryStatsDto(
            TotalBooks: items.Count,
            Reading: items.Count(i => i.ReadingStatus == ReadingStatus.Reading),
            Finished: items.Count(i => i.ReadingStatus == ReadingStatus.Finished),
            NotStarted: items.Count(i => i.ReadingStatus == ReadingStatus.NotStarted),
            TotalPages: items.Sum(i => books[i.Book.Id].PageCount),
            PagesRead: items.Sum(i => books[i.Book.Id].PageCount * i.ProgressPercent / 100),
            FinishedThisYear: entries.Count(e => e.FinishedAtUtc?.Year == year));

        var currentlyReading = items.FirstOrDefault(i => i.ReadingStatus == ReadingStatus.Reading)?.Book.Id;

        return Result.Success(new LibraryDto(items, stats, currentlyReading));
    }
}

public sealed record UpdateReadingProgressCommand(int CustomerId, int BookId, ReadingStatus Status, int ProgressPercent)
    : ICommand<LibraryItemDto>;

public sealed class UpdateReadingProgressCommandValidator : AbstractValidator<UpdateReadingProgressCommand>
{
    public UpdateReadingProgressCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.ProgressPercent).InclusiveBetween(0, 100);
    }
}

public sealed class UpdateReadingProgressCommandHandler(
    LibraryReader libraryReader,
    ILibraryEntryRepository libraryRepository,
    IBookRepository bookRepository,
    IUnitOfWork unitOfWork,
    IFileStorage fileStorage)
    : ICommandHandler<UpdateReadingProgressCommand, LibraryItemDto>
{
    public async Task<Result<LibraryItemDto>> Handle(UpdateReadingProgressCommand command, CancellationToken ct)
    {
        var (owned, _) = await libraryReader.LoadAsync(command.CustomerId, ct);
        if (!owned.TryGetValue(command.BookId, out var ownedBook))
            return Result.Failure<LibraryItemDto>(LibraryErrors.NotInLibrary(command.BookId));

        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure<LibraryItemDto>(LibraryErrors.BookNotFound(command.BookId));

        var entry = await libraryRepository.GetAsync(command.CustomerId, command.BookId, ct);
        if (entry is null)
        {
            entry = LibraryEntry.Create(command.CustomerId, command.BookId);
            libraryRepository.Add(entry);
        }

        entry.UpdateProgress(command.Status, command.ProgressPercent);

        // Two quick taps from two devices can race to create the same entry;
        // the unique (customer, book) index turns the loser into a clean 409.
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(new LibraryItemDto(
            book.ToSummaryDto(fileStorage, rating: null), ownedBook.Ownership,
            entry.ReadingStatus, entry.ProgressPercent, ownedBook.AcquiredAtUtc,
            entry.ReadingStatus == ReadingStatus.NotStarted ? null : entry.UpdatedAtUtc));
    }
}

/// "I already own this one" (bought elsewhere). Idempotent.
public sealed record AddOwnedBookCommand(int CustomerId, int BookId) : ICommand;

public sealed class AddOwnedBookCommandHandler(
    ILibraryEntryRepository libraryRepository, IBookRepository bookRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<AddOwnedBookCommand>
{
    public async Task<Result> Handle(AddOwnedBookCommand command, CancellationToken ct)
    {
        if (await bookRepository.GetByIdAsync(command.BookId, ct) is null)
            return Result.Failure(LibraryErrors.BookNotFound(command.BookId));

        var entry = await libraryRepository.GetAsync(command.CustomerId, command.BookId, ct);
        if (entry is null)
        {
            entry = LibraryEntry.Create(command.CustomerId, command.BookId);
            libraryRepository.Add(entry);
        }

        entry.MarkOwnedManually();
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}

/// Removes a MANUALLY added book. Purchased books can't be removed: the
/// orders say you own them. Idempotent.
public sealed record RemoveOwnedBookCommand(int CustomerId, int BookId) : ICommand;

public sealed class RemoveOwnedBookCommandHandler(ILibraryEntryRepository libraryRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<RemoveOwnedBookCommand>
{
    public async Task<Result> Handle(RemoveOwnedBookCommand command, CancellationToken ct)
    {
        var entry = await libraryRepository.GetAsync(command.CustomerId, command.BookId, ct);
        if (entry is null)
            return Result.Success();

        entry.ClearManualOwnership();

        // Nothing left worth keeping: delete instead of storing an empty row.
        if (entry.IsEmpty)
            libraryRepository.Remove(entry);

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}