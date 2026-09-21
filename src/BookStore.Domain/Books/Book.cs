using BookStore.Domain.Common;

namespace BookStore.Domain.Books;

public sealed class Book : AggregateRoot<int>
{
    // ==========================================
    // PROPERTIES (State)
    // ==========================================
    public string Title { get; private set; } = string.Empty;
    public string Author { get; private set; } = string.Empty;
    public string Isbn { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public Money Price { get; private set; } = null!;

    public int StockQuantity { get; private set; }
    public int ReservedQuantity { get; private set; }
    public int AvailableToSell => StockQuantity - ReservedQuantity;

    public bool IsActive { get; private set; }
    public byte[] RowVersion { get; private set; } = [];

    // ==========================================
    // CONSTRUCTORS
    // ==========================================
    
    private Book() { } // Required for EF Core

    private Book(
        string title, 
        string author, 
        string isbn, 
        string description,
        Money price, 
        int initialStock)
    {
        Title = title;
        Author = author;
        Isbn = isbn;
        Description = description;
        Price = price;
        StockQuantity = initialStock;
        ReservedQuantity = 0;
        IsActive = true; // Default to true on creation
    }

    // ==========================================
    // FACTORY METHODS
    // ==========================================

    public static Book Create(
        string title, 
        string author, 
        string isbn, 
        string description,
        Money price, 
        int initialStock)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.", nameof(title));
            
        if (string.IsNullOrWhiteSpace(author))
            throw new ArgumentException("Author is required.", nameof(author));

        if (price.Amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(price), "Price must be positive.");

        if (initialStock < 0)
            throw new ArgumentOutOfRangeException(nameof(initialStock), "Initial stock cannot be negative.");

        return new Book(title, author, isbn, description, price, initialStock);
    }

    // ==========================================
    // BUSINESS LOGIC: Details & Status
    // ==========================================

    public void UpdateDetails(string title, string author, string isbn, string description)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.", nameof(title));
            
        if (string.IsNullOrWhiteSpace(author))
            throw new ArgumentException("Author is required.", nameof(author));

        Title = title.Trim();
        Author = author.Trim();
        Isbn = isbn.Trim();
        Description = description.Trim();
    }

    public void UpdatePrice(Money newPrice)
    {
        if (newPrice.Amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(newPrice), "Price must be positive.");

        Price = newPrice;
    }

    public void Activate() => IsActive = true;
    
    public void Deactivate() => IsActive = false;

    // ==========================================
    // BUSINESS LOGIC: Stock & Reservations
    // ==========================================

    public void Reserve(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be positive.");
            
        if (AvailableToSell < quantity)
            throw new InsufficientStockException(Id, quantity, AvailableToSell);

        ReservedQuantity += quantity;
    }

    public void ReleaseReservation(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be positive.");
            
        if (quantity > ReservedQuantity)
            throw new InvalidOperationException($"Cannot release {quantity} unit(s); only {ReservedQuantity} are reserved.");

        ReservedQuantity -= quantity;
    }

    public void ConfirmSale(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be positive.");
            
        if (quantity > ReservedQuantity)
            throw new InvalidOperationException($"Cannot confirm sale of {quantity} unit(s); only {ReservedQuantity} are reserved.");

        ReservedQuantity -= quantity;
        StockQuantity -= quantity;
    }

    public void Restock(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be positive.");

        StockQuantity += quantity;
    }

    /// <summary>
    /// Sets physical stock to an exact counted number (after a warehouse
    /// count, damaged copies, etc.). Can never drop below what's currently
    /// reserved by pending orders, or those customers would pay for books
    /// that no longer exist.
    /// </summary>
    public void SetStockQuantity(int newQuantity)
    {
        if (newQuantity < 0)
            throw new ArgumentOutOfRangeException(nameof(newQuantity), "Stock cannot be negative.");
            
        if (newQuantity < ReservedQuantity)
            throw new InvalidOperationException($"Cannot set stock to {newQuantity}; {ReservedQuantity} unit(s) are reserved by pending orders.");

        StockQuantity = newQuantity;
    }
}