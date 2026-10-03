using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Reviews.Queries;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Catalog;
using BookStore.Application.Common;
using BookStore.Domain.Books;

namespace BookStore.Application.Books.Queries;

public sealed record GetPublicBooksQuery : IQuery<IReadOnlyList<PublicBookDto>>;

public sealed class GetPublicBooksQueryHandler(
    IBookRepository bookRepository,
    IReviewQueries reviewQueries,
    TaxonomyLookupLoader taxonomyLoader,
    IFileStorage fileStorage)
    : IQueryHandler<GetPublicBooksQuery, IReadOnlyList<PublicBookDto>>
{
    public async Task<Result<IReadOnlyList<PublicBookDto>>> Handle(GetPublicBooksQuery query, CancellationToken ct)
    {
        var books = await bookRepository.ListAsync(includeInactive: false, ct);
        var ratings = await reviewQueries.GetRatingSnapshotsAsync(books.Select(b => b.Id).ToList(), ct);
        var taxonomy = await taxonomyLoader.LoadAsync(ct);

        return Result.Success<IReadOnlyList<PublicBookDto>>(
            books.Select(b => b.ToPublicDto(fileStorage, ratings.GetValueOrDefault(b.Id), taxonomy)).ToList());
    }
}

public sealed record GetPublicBookByIdQuery(int BookId) : IQuery<PublicBookDto>;

public sealed class GetPublicBookByIdQueryHandler(
    IBookRepository bookRepository,
    IReviewQueries reviewQueries,
    TaxonomyLookupLoader taxonomyLoader,
    IFileStorage fileStorage)
    : IQueryHandler<GetPublicBookByIdQuery, PublicBookDto>
{
    public async Task<Result<PublicBookDto>> Handle(GetPublicBookByIdQuery query, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(query.BookId, ct);
        if (book is null || !book.IsActive)
            return Result.Failure<PublicBookDto>(BookErrors.NotFound(query.BookId));

        return Result.Success(await MapAsync(book, bookRepository, reviewQueries, taxonomyLoader, fileStorage, ct));
    }

    internal static async Task<PublicBookDto> MapAsync(
     Book book,
     IBookRepository bookRepository,
     IReviewQueries reviewQueries,
     TaxonomyLookupLoader taxonomyLoader,
     IFileStorage fileStorage,
     CancellationToken ct)
    {
        var editions = book.EditionGroupId is { } groupId
            ? (await bookRepository.ListEditionGroupAsync(groupId, forUpdate: false, ct))
                .Where(b => b.Id != book.Id && b.IsActive)
                .OrderBy(b => b.Price.Amount)
                .ToList()
            : [];

        var relatedIds = book.OrderedRelatedBookIds;
        var relatedById = relatedIds.Count == 0
            ? new Dictionary<int, Book>()
            : (await bookRepository.ListByIdsAsync(relatedIds, ct)).ToDictionary(b => b.Id);

        // Curated order, hidden books skipped.
        var related = relatedIds
            .Where(id => relatedById.TryGetValue(id, out var r) && r.IsActive)
            .Select(id => relatedById[id])
            .ToList();

        // One ratings query for the book and every card around it.
        var allIds = editions.Select(b => b.Id).Concat(related.Select(b => b.Id)).Append(book.Id).Distinct().ToList();
        var ratings = await reviewQueries.GetRatingSnapshotsAsync(allIds, ct);
        var taxonomy = await taxonomyLoader.LoadAsync(ct);

        var extras = new BookPageExtras(
            editions.Select(b => b.ToSummaryDto(fileStorage, ratings.GetValueOrDefault(b.Id))).ToList(),
            related.Select(b => b.ToSummaryDto(fileStorage, ratings.GetValueOrDefault(b.Id))).ToList());

        return book.ToPublicDto(fileStorage, ratings.GetValueOrDefault(book.Id), taxonomy, extras);
    }
}

public sealed record GetPublicBookBySlugQuery(string Slug) : IQuery<PublicBookDto>;

public sealed class GetPublicBookBySlugQueryHandler(
    IBookRepository bookRepository,
    IReviewQueries reviewQueries,
    TaxonomyLookupLoader taxonomyLoader,
    IFileStorage fileStorage)
    : IQueryHandler<GetPublicBookBySlugQuery, PublicBookDto>
{
    public async Task<Result<PublicBookDto>> Handle(GetPublicBookBySlugQuery query, CancellationToken ct)
    {
        Book? book;
        try
        {
            book = await bookRepository.GetBySlugAsync(query.Slug, ct);
        }
        catch (ArgumentException)
        {
            // A "slug" made only of punctuation can't be normalised: it
            // simply doesn't exist.
            book = null;
        }

        if (book is null || !book.IsActive)
            return Result.Failure<PublicBookDto>(BookErrors.SlugNotFound(query.Slug));

        return Result.Success(await GetPublicBookByIdQueryHandler.MapAsync(
     book, bookRepository, reviewQueries, taxonomyLoader, fileStorage, ct));
    }
}