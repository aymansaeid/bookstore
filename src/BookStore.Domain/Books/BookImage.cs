using BookStore.Domain.Common;

namespace BookStore.Domain.Books;

public sealed class BookImage : Entity<int>
{
    /// The master file. For images processed by step D this ends in ".webp",
    /// and each variant lives next to it as "<master>-<width>.webp".
    public string StorageKey { get; private set; } = string.Empty;
    public string AltText { get; private set; } = string.Empty;
    public int DisplayOrder { get; private set; }
    public bool IsCover { get; private set; }

    /// Master dimensions, so the frontend can reserve space before loading.
    /// Null for images uploaded before step D.
    public int? Width { get; private set; }
    public int? Height { get; private set; }

    // Stored as text ("300,600,1200"); EF maps this field directly. Empty
    // for images uploaded before step D: they have no variants yet.
    private string _variantWidths = string.Empty;

    public IReadOnlyList<int> VariantWidths =>
        _variantWidths.Length == 0 ? [] : _variantWidths.Split(',').Select(int.Parse).ToList();

    private BookImage() { } // EF Core

    internal static BookImage Create(
        string storageKey, string altText, int displayOrder, bool isCover,
        int? width = null, int? height = null, IEnumerable<int>? variantWidths = null)
    {
        var image = new BookImage { AltText = altText, DisplayOrder = displayOrder, IsCover = isCover };
        image.SetRendition(storageKey, width, height, variantWidths ?? []);
        return image;
    }

    internal void SetRendition(string storageKey, int? width, int? height, IEnumerable<int> variantWidths)
    {
        StorageKey = storageKey;
        Width = width;
        Height = height;
        _variantWidths = string.Join(',', variantWidths.Distinct().OrderBy(w => w));
    }

    internal void SetCover(bool isCover) => IsCover = isCover;
    internal void SetDisplayOrder(int order) => DisplayOrder = order;

    public void UpdateAltText(string altText) => AltText = altText.Trim();

    public string VariantStorageKey(int width) =>
        StorageKey.EndsWith(".webp", StringComparison.Ordinal)
            ? $"{StorageKey[..^".webp".Length]}-{width}.webp"
            : StorageKey;

    /// Master plus every variant: everything to delete when the image goes.
    public IReadOnlyList<string> AllStorageKeys() =>
        VariantWidths.Select(VariantStorageKey).Prepend(StorageKey).ToList();
}