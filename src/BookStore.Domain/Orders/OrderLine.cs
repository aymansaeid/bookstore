using BookStore.Domain.Common;

namespace BookStore.Domain.Orders;

public sealed class OrderLine : Entity<int>
{
    // Reference by id only — never a navigation property to Book. Order and
    // Book are separate aggregates; crossing that boundary with a direct
    // reference is how "small" changes ripple into unrelated aggregates.
    public int BookId { get; private set; }
    public string BookTitleSnapshot { get; private set; } = string.Empty;
    public int Quantity { get; private set; }
    public Money UnitPriceAtPurchase { get; private set; } = null!;

    private OrderLine() { } // EF Core

    private OrderLine(int bookId, string bookTitleSnapshot, int quantity, Money unitPriceAtPurchase)
    {
        BookId = bookId;
        BookTitleSnapshot = bookTitleSnapshot;
        Quantity = quantity;
        UnitPriceAtPurchase = unitPriceAtPurchase;
    }

    internal static OrderLine Create(int bookId, string bookTitleSnapshot, int quantity, Money unitPrice)
    {
        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity));

        return new OrderLine(bookId, bookTitleSnapshot, quantity, unitPrice);
    }

    public Money LineTotal => UnitPriceAtPurchase.MultiplyBy(Quantity);
}