using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Reviews.Queries;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using BookStore.Domain.Books;

namespace BookStore.Application.Books.Queries;

public sealed record GetPublicBooksQuery : IQuery<IReadOnlyList<PublicBookDto>>;

public sealed class GetPublicBooksQueryHandler(
    IBookRepository bookRepository, IReviewQueries reviewQueries, IFileStorage fileStorage)
    : IQueryHandler<GetPublicBooksQuery, IReadOnlyList<PublicBookDto>>
{
    public async Task<Result<IReadOnlyList<PublicBookDto>>> Handle(GetPublicBooksQuery query, CancellationToken ct)
    {
        var books = await bookRepository.ListAsync(includeInactive: false, ct);

        // One grouped query for every book's rating, not one per book.
        var ratings = await reviewQueries.GetRatingSnapshotsAsync(books.Select(b => b.Id).ToList(), ct);

        return Result.Success<IReadOnlyList<PublicBookDto>>(
            books.Select(b => b.ToPublicDto(fileStorage, ratings.GetValueOrDefault(b.Id))).ToList());
    }
}

public sealed record GetPublicBookByIdQuery(int BookId) : IQuery<PublicBookDto>;

public sealed class GetPublicBookByIdQueryHandler(
    IBookRepository bookRepository, IReviewQueries reviewQueries, IFileStorage fileStorage)
    : IQueryHandler<GetPublicBookByIdQuery, PublicBookDto>
{
    public async Task<Result<PublicBookDto>> Handle(GetPublicBookByIdQuery query, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(query.BookId, ct);
        if (book is null || !book.IsActive)
            return Result.Failure<PublicBookDto>(BookErrors.NotFound(query.BookId));

        return Result.Success(await MapAsync(book, reviewQueries, fileStorage, ct));
    }

    internal static async Task<PublicBookDto> MapAsync(
        Book book, IReviewQueries reviewQueries, IFileStorage fileStorage, CancellationToken ct)
    {
        var ratings = await reviewQueries.GetRatingSnapshotsAsync([book.Id], ct);
        return book.ToPublicDto(fileStorage, ratings.GetValueOrDefault(book.Id));
    }
}

public sealed record GetPublicBookBySlugQuery(string Slug) : IQuery<PublicBookDto>;

public sealed class GetPublicBookBySlugQueryHandler(
    IBookRepository bookRepository, IReviewQueries reviewQueries, IFileStorage fileStorage)
    : IQueryHandler<GetPublicBookBySlugQuery, PublicBookDto>
{
    public async Task<Result<PublicBookDto>> Handle(GetPublicBookBySlugQuery query, CancellationToken ct)
    {
        var book = await bookRepository.GetBySlugAsync(query.Slug.Trim().ToLowerInvariant(), ct);
        if (book is null || !book.IsActive)
            return Result.Failure<PublicBookDto>(BookErrors.SlugNotFound(query.Slug));

        return Result.Success(await GetPublicBookByIdQueryHandler.MapAsync(book, reviewQueries, fileStorage, ct));
    }
}