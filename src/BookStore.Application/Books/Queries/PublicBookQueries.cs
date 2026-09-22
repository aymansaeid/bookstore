using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;

namespace BookStore.Application.Books.Queries;

public sealed record GetPublicBooksQuery : IQuery<IReadOnlyList<PublicBookDto>>;

public sealed class GetPublicBooksQueryHandler(IBookRepository bookRepository, IFileStorage fileStorage)
    : IQueryHandler<GetPublicBooksQuery, IReadOnlyList<PublicBookDto>>
{
    public async Task<Result<IReadOnlyList<PublicBookDto>>> Handle(GetPublicBooksQuery query, CancellationToken ct)
    {
        var books = await bookRepository.ListAsync(includeInactive: false, ct);
        return Result.Success<IReadOnlyList<PublicBookDto>>(
            books.Select(b => b.ToPublicDto(fileStorage)).ToList());
    }
}

public sealed record GetPublicBookByIdQuery(int BookId) : IQuery<PublicBookDto>;

public sealed class GetPublicBookByIdQueryHandler(IBookRepository bookRepository, IFileStorage fileStorage)
    : IQueryHandler<GetPublicBookByIdQuery, PublicBookDto>
{
    public async Task<Result<PublicBookDto>> Handle(GetPublicBookByIdQuery query, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(query.BookId, ct);

        if (book is null || !book.IsActive)
            return Result.Failure<PublicBookDto>(BookErrors.NotFound(query.BookId));

        return Result.Success(book.ToPublicDto(fileStorage));
    }
}

public sealed record GetPublicBookBySlugQuery(string Slug) : IQuery<PublicBookDto>;

public sealed class GetPublicBookBySlugQueryHandler(IBookRepository bookRepository, IFileStorage fileStorage)
    : IQueryHandler<GetPublicBookBySlugQuery, PublicBookDto>
{
    public async Task<Result<PublicBookDto>> Handle(GetPublicBookBySlugQuery query, CancellationToken ct)
    {
        var book = await bookRepository.GetBySlugAsync(query.Slug.Trim().ToLowerInvariant(), ct);

        if (book is null || !book.IsActive)
            return Result.Failure<PublicBookDto>(BookErrors.SlugNotFound(query.Slug));

        return Result.Success(book.ToPublicDto(fileStorage));
    }
}