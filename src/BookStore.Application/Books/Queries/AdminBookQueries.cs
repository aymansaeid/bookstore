using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;

namespace BookStore.Application.Books.Queries;

public sealed record GetAdminBooksQuery : IQuery<IReadOnlyList<AdminBookDto>>;

public sealed class GetAdminBooksQueryHandler(IBookRepository bookRepository, IFileStorage fileStorage)
    : IQueryHandler<GetAdminBooksQuery, IReadOnlyList<AdminBookDto>>
{
    public async Task<Result<IReadOnlyList<AdminBookDto>>> Handle(GetAdminBooksQuery query, CancellationToken ct)
    {
        var books = await bookRepository.ListAsync(includeInactive: true, ct);
        return Result.Success<IReadOnlyList<AdminBookDto>>(
            books.Select(b => b.ToAdminDto(fileStorage)).ToList());
    }
}

public sealed record GetAdminBookByIdQuery(int BookId) : IQuery<AdminBookDto>;

public sealed class GetAdminBookByIdQueryHandler(IBookRepository bookRepository, IFileStorage fileStorage)
    : IQueryHandler<GetAdminBookByIdQuery, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(GetAdminBookByIdQuery query, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(query.BookId, ct);
        return book is null
            ? Result.Failure<AdminBookDto>(BookErrors.NotFound(query.BookId))
            : Result.Success(book.ToAdminDto(fileStorage));
    }
}