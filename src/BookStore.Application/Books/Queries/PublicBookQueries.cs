using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;

namespace BookStore.Application.Books.Queries;

public sealed record GetPublicBooksQuery : IQuery<IReadOnlyList<PublicBookDto>>;

public sealed class GetPublicBooksQueryHandler(IBookRepository bookRepository)
    : IQueryHandler<GetPublicBooksQuery, IReadOnlyList<PublicBookDto>>
{
    public async Task<Result<IReadOnlyList<PublicBookDto>>> Handle(GetPublicBooksQuery query, CancellationToken ct)
    {
        var books = await bookRepository.ListAsync(includeInactive: false, ct);
        return Result.Success<IReadOnlyList<PublicBookDto>>(books.Select(b => b.ToPublicDto()).ToList());
    }
}

public sealed record GetPublicBookByIdQuery(int BookId) : IQuery<PublicBookDto>;

public sealed class GetPublicBookByIdQueryHandler(IBookRepository bookRepository)
    : IQueryHandler<GetPublicBookByIdQuery, PublicBookDto>
{
    public async Task<Result<PublicBookDto>> Handle(GetPublicBookByIdQuery query, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(query.BookId, ct);

        // Inactive books look exactly like missing ones to the public.
        if (book is null || !book.IsActive)
            return Result.Failure<PublicBookDto>(BookErrors.NotFound(query.BookId));

        return Result.Success(book.ToPublicDto());
    }
}