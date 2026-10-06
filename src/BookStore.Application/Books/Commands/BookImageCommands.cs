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
    IImageProcessor imageProcessor,
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

        ProcessedImage processed;
        try
        {
            processed = await imageProcessor.ProcessAsync(command.Content, ct);
        }
        catch (InvalidImageException ex)
        {
            // The processor's message says exactly what's wrong (too big,
            // too small, damaged): pass it to the admin.
            return Result.Failure<BookImageDto>(Error.Validation("Book.InvalidImage", ex.Message));
        }

        using (processed)
        {
            var baseKey = $"books/{Guid.NewGuid():N}";
            var masterKey = $"{baseKey}.webp";
            var savedKeys = new List<string>();

            try
            {
                await fileStorage.SaveWithKeyAsync(masterKey, processed.Master, ct);
                savedKeys.Add(masterKey);

                foreach (var variant in processed.Variants)
                {
                    var variantKey = $"{baseKey}-{variant.Width}.webp";
                    await fileStorage.SaveWithKeyAsync(variantKey, variant.Content, ct);
                    savedKeys.Add(variantKey);
                }

                var image = book.AddImage(
                    masterKey, command.AltText, processed.Width, processed.Height,
                    processed.Variants.Select(v => v.Width).ToList());

                await unitOfWork.SaveChangesAsync(ct);

                return Result.Success(image.ToDto(fileStorage));
            }
            catch
            {
                // Files first, row second: if anything failed, remove every
                // file already written, so no orphans are left behind.
                foreach (var key in savedKeys)
                    await SafeDeleteAsync(key, ct);

                throw;
            }
        }
    }

    private async Task SafeDeleteAsync(string storageKey, CancellationToken ct)
    {
        try
        {
            await fileStorage.DeleteAsync(storageKey, ct);
        }
        catch (Exception ex)
        {
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

        var image = book.Images.FirstOrDefault(i => i.Id == command.ImageId);
        if (image is null)
            return Result.Failure(BookErrors.ImageNotFound(command.ImageId));

        // Collected BEFORE removal: the master and every variant.
        var keys = image.AllStorageKeys();

        book.RemoveImage(command.ImageId);
        await unitOfWork.SaveChangesAsync(ct);

        // Files after the commit: a leftover file is harmless, a row
        // pointing at a deleted file is not.
        foreach (var key in keys)
        {
            try
            {
                await fileStorage.DeleteAsync(key, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Image row deleted but file {StorageKey} remains", key);
            }
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

public sealed record ReorderBookImagesCommand(int BookId, IReadOnlyList<int> ImageIdsInOrder)
    : ICommand, IAuditableCommand
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