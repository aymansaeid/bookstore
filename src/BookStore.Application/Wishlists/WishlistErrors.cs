using BookStore.Application.Common;

namespace BookStore.Application.Wishlists;

public static class WishlistErrors
{
    public static Error BookNotFound =>
        Error.NotFound("Wishlist.BookNotFound", "That book was not found.");

    public static Error NotInWishlist =>
        Error.NotFound("Wishlist.NotInWishlist", "That book isn't in your wishlist.");
}