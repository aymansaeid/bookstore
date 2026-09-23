using BookStore.Domain.Wishlists;

namespace BookStore.Application.Abstractions.Repositories;

public interface IWishlistRepository
{
    Task<IReadOnlyList<WishlistItem>> ListByCustomerAsync(int customerId, CancellationToken ct = default);
    Task<bool> ExistsAsync(int customerId, int bookId, CancellationToken ct = default);
    Task<WishlistItem?> GetAsync(int customerId, int bookId, CancellationToken ct = default);
    void Add(WishlistItem item);
    void Remove(WishlistItem item);
}