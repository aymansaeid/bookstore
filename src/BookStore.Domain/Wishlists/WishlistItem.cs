using BookStore.Domain.Common;

namespace BookStore.Domain.Wishlists;

/// Deliberately one row per (customer, book) rather than a collection owned
/// by Customer: a wishlist can grow large, and loading it on every auth
/// check would be pure waste.
public sealed class WishlistItem : AggregateRoot<int>
{
    public int CustomerId { get; private set; }
    public int BookId { get; private set; }
    public DateTimeOffset AddedAtUtc { get; private set; }

    private WishlistItem() { } // EF Core

    public static WishlistItem Create(int customerId, int bookId) =>
        new()
        {
            CustomerId = customerId,
            BookId = bookId,
            AddedAtUtc = DateTimeOffset.UtcNow
        };
}