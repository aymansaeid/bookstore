using BookStore.Application.Common;

namespace BookStore.Application.Inventory;

public static class InventoryErrors
{
    public static Error BookNotFound(int bookId) =>
        Error.NotFound("Inventory.BookNotFound", $"Book {bookId} was not found.");
}