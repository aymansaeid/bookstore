namespace BookStore.Domain.Books;

public sealed class InsufficientStockException(int bookId, int requested, int available)
    : Exception($"Cannot reserve {requested} unit(s) of book {bookId}; only {available} available.")
{
    public int BookId { get; } = bookId;
    public int Requested { get; } = requested;
    public int Available { get; } = available;
}