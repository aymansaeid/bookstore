using BookStore.Domain.Common;

namespace BookStore.Domain.Books;

public sealed class Book : AggregateRoot<int>
{
    public string Title { get; private set; } = string.Empty;
    public string Author { get; private set; } = string.Empty;
    public string Isbn { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;

    public decimal Price { get; private set; }
    public string Currency { get; private set; } = "USD";

    // Physical count actually sitting in the warehouse.
    public int StockQuantity { get; private set; }

    // Held against in-flight (unpaid) orders — never sold, but not available either.
    public int ReservedQuantity { get; private set; }

    // Used for optimistic concurrency on admin-driven edits (price changes,
    // manual restocks). Deliberately NOT relied on to guard the checkout
    // reservation path — a load-then-save round trip is exactly the race
    // window that would let two guests both "win" the last copy. That path
    // uses a dedicated atomic SQL update in the repository instead.
    public byte[] RowVersion { get; private set; } = [];

    private Book() { } // EF Core

    private Book(string title, string author, string isbn, string description,
        decimal price, string currency, int initialStock)
    {
        Title = title;
        Author = author;
        Isbn = isbn;
        Description = description;
        Price = price;
        Currency = currency;
        StockQuantity = initialStock;
        ReservedQuantity = 0;
    }

    public static Book Create(string title, string author, string isbn, string description,
        decimal price, string currency, int initialStock)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.", nameof(title));
        if (price <= 0)
            throw new ArgumentOutOfRangeException(nameof(price), "Price must be positive.");
        if (initialStock < 0)
            throw new ArgumentOutOfRangeException(nameof(initialStock), "Initial stock cannot be negative.");

        return new Book(title, author, isbn, description, price, currency, initialStock);
    }

    public int AvailableToSell => StockQuantity - ReservedQuantity;

    /// <summary>
    /// Domain rule for reserving stock against a pending order. The race-safe
    /// enforcement of this lives in IBookRepository.TryReserveStockAsync
    /// (atomic SQL update) — call this method directly only when you already
    /// know the reservation succeeded at the data layer, or in unit tests.
    /// </summary>
    public void Reserve(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity));
        if (AvailableToSell < quantity)
            throw new InsufficientStockException(Id, quantity, AvailableToSell);

        ReservedQuantity += quantity;
    }

    /// Releases a reservation without touching physical stock — used when a
    /// Stripe Checkout Session expires or is abandoned before payment.
    public void ReleaseReservation(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity));
        if (quantity > ReservedQuantity)
            throw new InvalidOperationException(
                $"Cannot release {quantity} unit(s); only {ReservedQuantity} are reserved.");

        ReservedQuantity -= quantity;
    }

    /// Converts a reservation into a permanent stock deduction. Called from
    /// the Stripe webhook handler once payment is confirmed.
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

    public void UpdatePrice(decimal newPrice)
    {
        if (newPrice <= 0)
            throw new ArgumentOutOfRangeException(nameof(newPrice), "Price must be positive.");

        Price = newPrice;
    }
}