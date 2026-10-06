using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using Microsoft.Extensions.Logging;

namespace BookStore.Application.Catalog.Commands;

public sealed record ImageRegenerationResult(int Converted, int Missing, int Failed);

/// Converts images uploaded before step D: WebP master, variants, width and
/// height. Safe to run repeatedly; already-converted images are skipped.
public sealed record RegenerateImageVariantsCommand : ICommand<ImageRegenerationResult>, IAuditableCommand
{
    public string AuditEntityType => "Catalog";
    public string? AuditEntityId => null;
}

public sealed class RegenerateImageVariantsCommandHandler(
    IBookRepository bookRepository,
    IFileStorage fileStorage,
    IImageProcessor imageProcessor,
    IUnitOfWork unitOfWork,
    ILogger<RegenerateImageVariantsCommandHandler> logger)
    : ICommandHandler<RegenerateImageVariantsCommand, ImageRegenerationResult>
{
    public async Task<Result<ImageRegenerationResult>> Handle(RegenerateImageVariantsCommand command, CancellationToken ct)
    {
        int converted = 0, missing = 0, failed = 0;

        // Untracked pass just to find books with old-style images.
        var candidates = (await bookRepository.ListAsync(includeInactive: true, ct))
            .Where(b => b.Images.Any(i => i.Width is null))
            .Select(b => b.Id)
            .ToList();

        foreach (var bookId in candidates)
        {
            var book = await bookRepository.GetByIdAsync(bookId, ct);
            if (book is null)
                continue;

            var replacedKeys = new List<string>();

            foreach (var image in book.Images.Where(i => i.Width is null).ToList())
            {
                await using var source = await fileStorage.OpenReadAsync(image.StorageKey, ct);
                if (source is null)
                {
                    missing++;
                    logger.LogWarning("Image {ImageId} of book {BookId}: file {Key} is missing.", image.Id, bookId, image.StorageKey);
                    continue;
                }

                try
                {
                    using var processed = await imageProcessor.ProcessAsync(source, ct);

                    var baseKey = $"books/{Guid.NewGuid():N}";
                    await fileStorage.SaveWithKeyAsync($"{baseKey}.webp", processed.Master, ct);
                    foreach (var variant in processed.Variants)
                        await fileStorage.SaveWithKeyAsync($"{baseKey}-{variant.Width}.webp", variant.Content, ct);

                    replacedKeys.Add(image.StorageKey);
                    book.ReplaceImageRendition(
                        image.Id, $"{baseKey}.webp", processed.Width, processed.Height,
                        processed.Variants.Select(v => v.Width).ToList());

                    converted++;
                }
                catch (InvalidImageException ex)
                {
                    // E.g. an old upload under 200px wide. It keeps working
                    // as before, just without variants.
                    failed++;
                    logger.LogWarning("Image {ImageId} of book {BookId} not converted: {Reason}", image.Id, bookId, ex.Message);
                }
            }

            await unitOfWork.SaveChangesAsync(ct);

            // Old originals go only after the new keys are committed.
            foreach (var oldKey in replacedKeys)
            {
                try { await fileStorage.DeleteAsync(oldKey, ct); }
                catch (Exception ex) { logger.LogError(ex, "Could not delete replaced original {Key}", oldKey); }
            }
        }

        // Persists the audit row even when there was nothing to convert.
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(new ImageRegenerationResult(converted, missing, failed));
    }
}