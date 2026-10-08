using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Reviews.Queries;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Books;
using BookStore.Application.Common;
using BookStore.Application.Library;
using BookStore.Domain.Books;
using BookStore.Domain.Library;
using BookStore.Domain.ReadingPaths;
using Microsoft.Extensions.Options;

namespace BookStore.Application.ReadingPaths;

/// What we know about the viewer, when they're signed in.
public sealed record PathViewer(
    IReadOnlyDictionary<int, OwnedBook> Owned,
    IReadOnlyDictionary<int, LibraryEntry> Entries,
    IReadOnlyDictionary<int, PathEnrollment> EnrollmentsByPath);

public sealed class ReadingPathAssembler(
    IBookRepository bookRepository,
    IPathEnrollmentRepository enrollmentRepository,
    IReviewQueries reviewQueries,
    IFileStorage fileStorage,
    IOptions<StoreOptions> storeOptions)
{
    private const int CoversOnCard = 4;

    public async Task<IReadOnlyList<ReadingPathSummaryDto>> SummariesAsync(IReadOnlyList<ReadingPath> paths, CancellationToken ct)
    {
        var books = await LoadBooksAsync(paths, ct);
        var counts = await enrollmentRepository.CountPerPathAsync(ct);
        var mostChosenId = MostChosen(counts);

        return paths.Select(p => Summary(p, books, counts, mostChosenId)).ToList();
    }

    public async Task<ReadingPathDto> DetailAsync(ReadingPath path, PathViewer? viewer, CancellationToken ct)
    {
        var books = await LoadBooksAsync([path], ct);
        var counts = await enrollmentRepository.CountPerPathAsync(ct);
        var ratings = await reviewQueries.GetRatingSnapshotsAsync(books.Keys.ToList(), ct);

        var summary = Summary(path, books, counts, MostChosen(counts));
        var visibleStages = VisibleStages(path, books);

        var finished = visibleStages
            .Where(s => viewer?.Entries.GetValueOrDefault(s.BookId)?.ReadingStatus == ReadingStatus.Finished)
            .Select(s => s.StageNumber)
            .ToHashSet();

        var enrollment = viewer?.EnrollmentsByPath.GetValueOrDefault(path.Id);
        var currentStage = enrollment is null
            ? (int?)null
            : visibleStages.FirstOrDefault(s => !finished.Contains(s.StageNumber))?.StageNumber;

        var stages = visibleStages.Select(s => new PathStageDto(
            s.StageNumber, s.Reason, s.EstimatedWeeks,
            books[s.BookId].ToSummaryDto(fileStorage, ratings.GetValueOrDefault(s.BookId)),
            books[s.BookId].PageCount,
            Owned: viewer?.Owned.ContainsKey(s.BookId) ?? false,
            Finished: finished.Contains(s.StageNumber),
            IsCurrent: s.StageNumber == currentStage)).ToList();

        PathProgressDto? progress = null;
        if (viewer is not null)
        {
            // Spec §6: a path never asks you to buy what you already own.
            var remaining = visibleStages.Where(s => !viewer.Owned.ContainsKey(s.BookId)).Select(s => books[s.BookId]);

            progress = new PathProgressDto(
                enrollment is not null,
                enrollment?.StartedAtUtc,
                finished.Count,
                stages.Count,
                stages.Count == 0 ? 0 : finished.Count * 100 / stages.Count,
                currentStage,
                PathPricing.Calculate(remaining, path.DiscountPercentage, storeOptions.Value.Currency));
        }

        return new ReadingPathDto(summary, stages, progress);
    }

    private ReadingPathSummaryDto Summary(
        ReadingPath path, IReadOnlyDictionary<int, Book> books, IReadOnlyDictionary<int, int> counts, int? mostChosenId)
    {
        var stages = VisibleStages(path, books);

        return new ReadingPathSummaryDto(
            path.Id, path.Slug.Value, path.Title, path.Description, path.Level, path.EstimatedWeeks,
            stages.Count, path.IsFeatured, path.Id == mostChosenId, counts.GetValueOrDefault(path.Id),
            stages.Take(CoversOnCard)
                .Select(s => new PathCoverDto(s.StageNumber, s.BookId, books[s.BookId].Title,
                    BookMappings.CoverThumbnailUrl(books[s.BookId], fileStorage)))
                .ToList(),
            PathPricing.Calculate(stages.Select(s => books[s.BookId]), path.DiscountPercentage, storeOptions.Value.Currency));
    }

    /// A hidden book drops out of the path (and its price) until it's shown again.
    private static IReadOnlyList<ReadingPathStage> VisibleStages(ReadingPath path, IReadOnlyDictionary<int, Book> books) =>
        path.OrderedStages.Where(s => books.TryGetValue(s.BookId, out var b) && b.IsActive).ToList();

    /// Among ALL paths, not just the ones on screen: "most chosen" must mean the same everywhere.
    private static int? MostChosen(IReadOnlyDictionary<int, int> counts)
    {
        var top = counts.Where(kv => kv.Value > 0).OrderByDescending(kv => kv.Value).ThenBy(kv => kv.Key).FirstOrDefault();
        return top.Value > 0 ? top.Key : null;
    }

    private async Task<IReadOnlyDictionary<int, Book>> LoadBooksAsync(IReadOnlyList<ReadingPath> paths, CancellationToken ct)
    {
        var ids = paths.SelectMany(p => p.Stages).Select(s => s.BookId).Distinct().ToList();
        return ids.Count == 0
            ? new Dictionary<int, Book>()
            : (await bookRepository.ListByIdsAsync(ids, ct)).ToDictionary(b => b.Id);
    }
}