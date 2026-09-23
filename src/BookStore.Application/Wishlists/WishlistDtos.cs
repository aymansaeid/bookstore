using BookStore.Application.Books;

namespace BookStore.Application.Wishlists;

public sealed record WishlistItemDto(
    int BookId, string Slug, string Title, string Author,
    decimal Price, string Currency, bool InStock,
    string? CoverImageUrl, DateTimeOffset AddedAtUtc);