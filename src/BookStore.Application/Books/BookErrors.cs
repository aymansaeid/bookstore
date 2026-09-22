using BookStore.Application.Common;

namespace BookStore.Application.Books;

public static class BookErrors
{
    public static Error NotFound(int id) =>
        Error.NotFound("Book.NotFound", $"Book {id} was not found.");

    public static Error DuplicateIsbn(string isbn) =>
        Error.Conflict("Book.DuplicateIsbn", $"A book with ISBN '{isbn}' already exists.");

    public static Error StockBelowReserved(int reserved) =>
        Error.Conflict("Book.StockBelowReserved",
            $"Stock cannot be set below the {reserved} unit(s) currently reserved by pending orders.");
    public static Error DuplicateSlug(string slug) =>
    Error.Conflict("Book.DuplicateSlug", $"A book with the URL '{slug}' already exists.");

    public static Error SlugNotFound(string slug) =>
        Error.NotFound("Book.SlugNotFound", $"No book found at '{slug}'.");

    public static Error ImageNotFound(int imageId) =>
        Error.NotFound("Book.ImageNotFound", $"Image {imageId} was not found on this book.");

    public static Error TooManyImages =>
        Error.Conflict("Book.TooManyImages", $"A book can have at most {Domain.Books.Book.MaxImages} images.");

    public static Error InvalidImage =>
        Error.Validation("Book.InvalidImage", "The file must be a valid JPEG, PNG or WebP image under 5 MB.");

    public static Error InvalidReorderList =>
        Error.Validation("Book.InvalidReorderList", "The reorder list must contain every image of this book exactly once.");
}