using BookStore.Domain.Common;

namespace BookStore.Domain.Returns;

public sealed class ReturnLine : Entity<int>
{
    public int BookId { get; private set; }
    public string BookTitleSnapshot { get; private set; } = string.Empty;
    public int Quantity { get; private set; }

    /// Set when the parcel arrives and the admin inspects it.
    public ReturnItemCondition? ReceivedCondition { get; private set; }

    private ReturnLine() { } // EF Core

    internal static ReturnLine Create(int bookId, string title, int quantity) =>
        new() { BookId = bookId, BookTitleSnapshot = title, Quantity = quantity };

    internal void SetCondition(ReturnItemCondition condition) => ReceivedCondition = condition;
}