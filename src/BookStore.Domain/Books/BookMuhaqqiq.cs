namespace BookStore.Domain.Books;

/// Links a book to one of its muhaqqiqs, in credit order. Owned by Book.
public sealed class BookMuhaqqiq
{
    public int MuhaqqiqId { get; private set; }
    public int DisplayOrder { get; private set; }

    private BookMuhaqqiq() { } // EF Core

    internal static BookMuhaqqiq Create(int muhaqqiqId, int displayOrder) =>
        new() { MuhaqqiqId = muhaqqiqId, DisplayOrder = displayOrder };

    internal void SetDisplayOrder(int displayOrder) => DisplayOrder = displayOrder;
}