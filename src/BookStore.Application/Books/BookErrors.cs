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
}