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

/// Everything the single-book page needs, shared by the id and slug routes.
public sealed class BookPageAssembler(
    IBookRepository bookRepository,
    IReviewQueries reviewQueries,
    IReportingQueries reportingQueries,
    TaxonomyLookupLoader taxonomyLoader,
    IFileStorage fileStorage)
{
    public async Task<PublicBookDto> AssembleAsync(Book book, CancellationToken ct)
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

        var related = relatedIds
            .Where(id => relatedById.TryGetValue(id, out var r) && r.IsActive)
            .Select(id => relatedById[id])
            .ToList();

        var allIds = editions.Select(b => b.Id).Concat(related.Select(b => b.Id)).Append(book.Id).Distinct().ToList();
        var ratings = await reviewQueries.GetRatingSnapshotsAsync(allIds, ct);
        var taxonomy = await taxonomyLoader.LoadAsync(ct);

        var soldLast7Days = await reportingQueries.CountUnitsSoldAsync(book.Id, DateTimeOffset.UtcNow.AddDays(-7), ct);

        var extras = new BookPageExtras(
            editions.Select(b => b.ToSummaryDto(fileStorage, ratings.GetValueOrDefault(b.Id))).ToList(),
            related.Select(b => b.ToSummaryDto(fileStorage, ratings.GetValueOrDefault(b.Id))).ToList());

        return book.ToPublicDto(fileStorage, ratings.GetValueOrDefault(book.Id), taxonomy, extras, soldLast7Days);
    }
}

public sealed record GetPublicBookByIdQuery(int BookId) : IQuery<PublicBookDto>;

public sealed class GetPublicBookByIdQueryHandler(IBookRepository bookRepository, BookPageAssembler assembler)
    : IQueryHandler<GetPublicBookByIdQuery, PublicBookDto>
{
    public async Task<Result<PublicBookDto>> Handle(GetPublicBookByIdQuery query, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(query.BookId, ct);
        if (book is null || !book.IsActive)
            return Result.Failure<PublicBookDto>(BookErrors.NotFound(query.BookId));

        return Result.Success(await assembler.AssembleAsync(book, ct));
    }
}

public sealed record GetPublicBookBySlugQuery(string Slug) : IQuery<PublicBookDto>;

public sealed class GetPublicBookBySlugQueryHandler(IBookRepository bookRepository, BookPageAssembler assembler)
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
            book = null;
        }

        if (book is null || !book.IsActive)
            return Result.Failure<PublicBookDto>(BookErrors.SlugNotFound(query.Slug));

        return Result.Success(await assembler.AssembleAsync(book, ct));
    }
}