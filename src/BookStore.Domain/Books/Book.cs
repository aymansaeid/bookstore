using BookStore.Domain.Common;

namespace BookStore.Domain.Books;

public sealed class Book : AggregateRoot<int>
{
    public string Title { get; private set; } = string.Empty;
    public string Author { get; private set; } = string.Empty;
    public string Isbn { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;

    public Money Price { get; private set; } = null!;

    public int StockQuantity { get; private set; }
    public int ReservedQuantity { get; private set; }

    public byte[] RowVersion { get; private set; } = [];

    private Book() { } // EF Core

    private Book(string title, string author, string isbn, string description,
        Money price, int initialStock)
    {
        Title = title;
        Author = author;
        Isbn = isbn;
        Description = description;
        Price = price;
        StockQuantity = initialStock;
        ReservedQuantity = 0;
    }

    public static Book Create(string title, string author, string isbn, string description,
        Money price, int initialStock)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.", nameof(title));
        if (price.Amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(price), "Price must be positive.");
        if (initialStock < 0)
            throw new ArgumentOutOfRangeException(nameof(initialStock), "Initial stock cannot be negative.");

        return new Book(title, author, isbn, description, price, initialStock);
    }

    public int AvailableToSell => StockQuantity - ReservedQuantity;

    public void Reserve(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity));
        if (AvailableToSell < quantity)
            throw new InsufficientStockException(Id, quantity, AvailableToSell);

        ReservedQuantity += quantity;
    }

    public void ReleaseReservation(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity));
        if (quantity > ReservedQuantity)
            throw new InvalidOperationException(
                $"Cannot release {quantity} unit(s); only {ReservedQuantity} are reserved.");

        ReservedQuantity -= quantity;
    }

    public void ConfirmSale(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity));
        if (quantity > ReservedQuantity)
            throw new InvalidOperationException(
                $"Cannot confirm sale of {quantity} unit(s); only {ReservedQuantity} are reserved.");

        ReservedQuantity -= quantity;
        StockQuantity -= quantity;
    }

    public void Restock(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity));

        StockQuantity += quantity;
    }

    public void UpdatePrice(Money newPrice)
    {
        if (newPrice.Amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(newPrice), "Price must be positive.");

        Price = newPrice;
    }
}