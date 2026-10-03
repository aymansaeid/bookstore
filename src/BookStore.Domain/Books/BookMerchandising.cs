namespace BookStore.Domain.Books;

/// Reader level from spec section 7: مبتدئ / متوسط / متخصص.
public enum ReaderLevel
{
    Beginner = 0,
    Intermediate = 1,
    Specialist = 2
}

/// Editorial badges, combinable (a book can be both New and Deluxe).
[Flags]
public enum BookBadges
{
    None = 0,
    New = 1,
    Deluxe = 2,
    Bestseller = 4
}

/// A curated "complements your library" link from one book to another,
/// in display order. One-way on purpose. Owned by Book.
public sealed class BookRelation
{
    public int RelatedBookId { get; private set; }
    public int DisplayOrder { get; private set; }

    private BookRelation() { } // EF Core

    internal static BookRelation Create(int relatedBookId, int displayOrder) =>
        new() { RelatedBookId = relatedBookId, DisplayOrder = displayOrder };

    internal void SetDisplayOrder(int displayOrder) => DisplayOrder = displayOrder;
}