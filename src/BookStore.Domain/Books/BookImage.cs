using BookStore.Domain.Common;

namespace BookStore.Domain.Books;

public sealed class BookImage : Entity<int>
{
    /// Storage key, not a URL. The API turns it into a URL at read time,
    /// so moving from local disk to cloud storage doesn't require rewriting
    /// every stored row.
    public string StorageKey { get; private set; } = string.Empty;
    public string AltText { get; private set; } = string.Empty;
    public int DisplayOrder { get; private set; }
    public bool IsCover { get; private set; }

    private BookImage() { } // EF Core

    internal static BookImage Create(string storageKey, string altText, int displayOrder, bool isCover) =>
        new()
        {
            StorageKey = storageKey,
            AltText = altText,
            DisplayOrder = displayOrder,
            IsCover = isCover
        };

    internal void SetCover(bool isCover) => IsCover = isCover;
    internal void SetDisplayOrder(int order) => DisplayOrder = order;

    public void UpdateAltText(string altText) => AltText = altText.Trim();
}