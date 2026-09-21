using BookStore.Domain.Books;

namespace BookStore.Application.Books;

// What customers see: "in stock" yes/no, not your exact inventory numbers.
public sealed record PublicBookDto(
    int Id, string Title, string Author, string Isbn, string Description,
    decimal Price, string Currency, bool InStock);

// What the admin sees: the full inventory picture.
public sealed record AdminBookDto(
    int Id, string Title, string Author, string Isbn, string Description,
    decimal Price, string Currency,
    int StockQuantity, int ReservedQuantity, int AvailableToSell, bool IsActive);

public static class BookMappings
{
    public static PublicBookDto ToPublicDto(this Book b) =>
        new(b.Id, b.Title, b.Author, b.Isbn, b.Description,
            b.Price.Amount, b.Price.Currency, b.AvailableToSell > 0);

    public static AdminBookDto ToAdminDto(this Book b) =>
        new(b.Id, b.Title, b.Author, b.Isbn, b.Description,
            b.Price.Amount, b.Price.Currency,
            b.StockQuantity, b.ReservedQuantity, b.AvailableToSell, b.IsActive);
}