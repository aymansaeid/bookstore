using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using BookStore.Domain.Wishlists;

namespace BookStore.Application.Wishlists;

public sealed record AddToWishlistCommand(int CustomerId, int BookId) : ICommand;

public sealed class AddToWishlistCommandHandler(
    IWishlistRepository wishlistRepository,
    IBookRepository bookRepository,
    IUnitOfWork unitOfWork)
    : ICommandHandler<AddToWishlistCommand>
{
    public async Task<Result> Handle(AddToWishlistCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null || !book.IsActive)
            return Result.Failure(WishlistErrors.BookNotFound);

        // Idempotent: adding twice is a no-op, not an error. The UI heart
        // button shouldn't be able to produce a failure.
        if (await wishlistRepository.ExistsAsync(command.CustomerId, command.BookId, ct))
            return Result.Success();

        wishlistRepository.Add(WishlistItem.Create(command.CustomerId, command.BookId));
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}

public sealed record RemoveFromWishlistCommand(int CustomerId, int BookId) : ICommand;

public sealed class RemoveFromWishlistCommandHandler(
    IWishlistRepository wishlistRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<RemoveFromWishlistCommand>
{
    public async Task<Result> Handle(RemoveFromWishlistCommand command, CancellationToken ct)
    {
        var item = await wishlistRepository.GetAsync(command.CustomerId, command.BookId, ct);
        if (item is null)
            return Result.Success(); // Same reasoning as add: idempotent.

        wishlistRepository.Remove(item);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}

public sealed record GetWishlistQuery(int CustomerId) : IQuery<IReadOnlyList<WishlistItemDto>>;

public sealed class GetWishlistQueryHandler(
    IWishlistRepository wishlistRepository,
    IBookRepository bookRepository,
    IFileStorage fileStorage)
    : IQueryHandler<GetWishlistQuery, IReadOnlyList<WishlistItemDto>>
{
    public async Task<Result<IReadOnlyList<WishlistItemDto>>> Handle(GetWishlistQuery query, CancellationToken ct)
    {
        var items = await wishlistRepository.ListByCustomerAsync(query.CustomerId, ct);
        if (items.Count == 0)
            return Result.Success<IReadOnlyList<WishlistItemDto>>([]);

        // One batched query rather than N round trips.
        var books = await bookRepository.ListByIdsAsync(items.Select(i => i.BookId).ToList(), ct);
        var booksById = books.ToDictionary(b => b.Id);

        var dtos = items
            .Where(i => booksById.ContainsKey(i.BookId))
            .Select(i =>
            {
                var b = booksById[i.BookId];
                return new WishlistItemDto(
                    b.Id, b.Slug.Value, b.Title, b.Author,
                    b.Price.Amount, b.Price.Currency, b.AvailableToSell > 0,
                    b.CoverImage is null ? null : fileStorage.GetPublicUrl(b.CoverImage.StorageKey),
                    i.AddedAtUtc);
            })
            .OrderByDescending(d => d.AddedAtUtc)
            .ToList();

        return Result.Success<IReadOnlyList<WishlistItemDto>>(dtos);
    }
}