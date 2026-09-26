using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace BookStore.Application.Books.Commands;

public sealed record UploadBookImageCommand(int BookId, Stream Content, string ContentType, string AltText)
    : ICommand<BookImageDto>, IAuditableCommand
{
    public string AuditEntityType => "Book";
    public string? AuditEntityId => BookId.ToString();
    object IAuditableCommand.AuditDetails => new { BookId, ContentType, AltText };
}

public sealed class UploadBookImageCommandValidator : AbstractValidator<UploadBookImageCommand>
{
    public UploadBookImageCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.AltText).NotEmpty().MaximumLength(300);
    }
}

public sealed class UploadBookImageCommandHandler(
    IBookRepository bookRepository,
    IUnitOfWork unitOfWork,
    IFileStorage fileStorage,
    ILogger<UploadBookImageCommandHandler> logger)
    : ICommandHandler<UploadBookImageCommand, BookImageDto>
{
    public async Task<Result<BookImageDto>> Handle(UploadBookImageCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure<BookImageDto>(BookErrors.NotFound(command.BookId));

        if (book.Images.Count >= Domain.Books.Book.MaxImages)
            return Result.Failure<BookImageDto>(BookErrors.TooManyImages);

        // Save the file first, then record it. If the DB write fails we
        // delete the file below; the reverse order would risk a DB row
        // pointing at a file that was never written.
        var stored = await fileStorage.SaveAsync(command.Content, command.ContentType, "books", ct);

        try
        {
            book.AddImage(stored.StorageKey, command.AltText);
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch
        {
            await SafeDeleteAsync(stored.StorageKey, ct);
            throw;
        }

        var image = book.Images.First(i => i.StorageKey == stored.StorageKey);
        return Result.Success(image.ToDto(fileStorage));
    }

    private async Task SafeDeleteAsync(string storageKey, CancellationToken ct)
    {
        try
        {
            await fileStorage.DeleteAsync(storageKey, ct);
        }
        catch (Exception ex)
        {
            // An orphaned file wastes disk space but breaks nothing.
            logger.LogError(ex, "Failed to clean up orphaned upload {StorageKey}", storageKey);
        }
    }
}

public sealed record DeleteBookImageCommand(int BookId, int ImageId) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "Book";
    public string? AuditEntityId => BookId.ToString();
}

public sealed class DeleteBookImageCommandHandler(
    IBookRepository bookRepository,
    IUnitOfWork unitOfWork,
    IFileStorage fileStorage,
    ILogger<DeleteBookImageCommandHandler> logger)
    : ICommandHandler<DeleteBookImageCommand>
{
    public async Task<Result> Handle(DeleteBookImageCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure(BookErrors.NotFound(command.BookId));

        if (book.Images.All(i => i.Id != command.ImageId))
            return Result.Failure(BookErrors.ImageNotFound(command.ImageId));

        var storageKey = book.RemoveImage(command.ImageId);
        await unitOfWork.SaveChangesAsync(ct);

        // File deletion comes after the DB commit: a leftover file is
        // harmless, a dangling DB row pointing at a deleted file is not.
        try
        {
            await fileStorage.DeleteAsync(storageKey, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Image row deleted but file {StorageKey} remains", storageKey);
        }

        return Result.Success();
    }
}

public sealed record SetBookCoverImageCommand(int BookId, int ImageId) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "Book";
    public string? AuditEntityId => BookId.ToString();
}

public sealed class SetBookCoverImageCommandHandler(IBookRepository bookRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetBookCoverImageCommand>
{
    public async Task<Result> Handle(SetBookCoverImageCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure(BookErrors.NotFound(command.BookId));

        if (book.Images.All(i => i.Id != command.ImageId))
            return Result.Failure(BookErrors.ImageNotFound(command.ImageId));

        book.SetCoverImage(command.ImageId);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}

public sealed record ReorderBookImagesCommand(int BookId, IReadOnlyList<int> ImageIdsInOrder) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "Book";
    public string? AuditEntityId => BookId.ToString();
}

public sealed class ReorderBookImagesCommandHandler(IBookRepository bookRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<ReorderBookImagesCommand>
{
    public async Task<Result> Handle(ReorderBookImagesCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure(BookErrors.NotFound(command.BookId));

        try
        {
            book.ReorderImages(command.ImageIdsInOrder);
        }
        catch (InvalidOperationException)
        {
            return Result.Failure(BookErrors.InvalidReorderList);
        }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}