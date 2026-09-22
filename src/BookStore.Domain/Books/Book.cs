using BookStore.Domain.Common;

namespace BookStore.Domain.Books;

public sealed class Book : AggregateRoot<int>
{
    public const int MaxImages = 8;

    public string Title { get; private set; } = string.Empty;
    public string? Subtitle { get; private set; }
    public string Author { get; private set; } = string.Empty;
    public Slug Slug { get; private set; } = null!;
    public string Isbn { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;

    public BookFormat Format { get; private set; }
    public int PageCount { get; private set; }
    public string Language { get; private set; } = string.Empty; // ISO 639-1, e.g. "tr", "en"
    public string? Publisher { get; private set; }
    public DateOnly? PublicationDate { get; private set; }
    public BookDimensions Dimensions { get; private set; } = null!;

    public Money Price { get; private set; } = null!;

    public int StockQuantity { get; private set; }
    public int ReservedQuantity { get; private set; }

    private readonly List<BookImage> _images = [];
    public IReadOnlyCollection<BookImage> Images => _images.AsReadOnly();

    public bool IsActive { get; private set; }

    public byte[] RowVersion { get; private set; } = [];

    private Book() { } // EF Core

    public static Book Create(
        string title,
        string? subtitle,
        string author,
        Slug slug,
        string isbn,
        string description,
        BookFormat format,
        int pageCount,
        string language,
        string? publisher,
        DateOnly? publicationDate,
        BookDimensions dimensions,
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
        if (pageCount <= 0)
            throw new ArgumentOutOfRangeException(nameof(pageCount), "Page count must be positive.");

        return new Book
        {
            Title = title.Trim(),
            Subtitle = string.IsNullOrWhiteSpace(subtitle) ? null : subtitle.Trim(),
            Author = author.Trim(),
            Slug = slug,
            Isbn = isbn.Trim(),
            Description = description.Trim(),
            Format = format,
            PageCount = pageCount,
            Language = language.Trim().ToLowerInvariant(),
            Publisher = string.IsNullOrWhiteSpace(publisher) ? null : publisher.Trim(),
            PublicationDate = publicationDate,
            Dimensions = dimensions,
            Price = price,
            StockQuantity = initialStock,
            ReservedQuantity = 0,
            IsActive = true
        };
    }

    public int AvailableToSell => StockQuantity - ReservedQuantity;

    public BookImage? CoverImage => _images.FirstOrDefault(i => i.IsCover);

    public IReadOnlyList<BookImage> OrderedImages =>
        _images.OrderByDescending(i => i.IsCover).ThenBy(i => i.DisplayOrder).ToList();

    // Note: Slug and Isbn are intentionally absent — a slug is permanent
    // (shared links must not break) and an ISBN identifies the edition.
    public void UpdateDetails(
        string title,
        string? subtitle,
        string author,
        string description,
        BookFormat format,
        int pageCount,
        string language,
        string? publisher,
        DateOnly? publicationDate,
        BookDimensions dimensions)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.", nameof(title));
        if (string.IsNullOrWhiteSpace(author))
            throw new ArgumentException("Author is required.", nameof(author));
        if (pageCount <= 0)
            throw new ArgumentOutOfRangeException(nameof(pageCount), "Page count must be positive.");

        Title = title.Trim();
        Subtitle = string.IsNullOrWhiteSpace(subtitle) ? null : subtitle.Trim();
        Author = author.Trim();
        Description = description.Trim();
        Format = format;
        PageCount = pageCount;
        Language = language.Trim().ToLowerInvariant();
        Publisher = string.IsNullOrWhiteSpace(publisher) ? null : publisher.Trim();
        PublicationDate = publicationDate;
        Dimensions = dimensions;
    }

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

    public void SetStockQuantity(int newQuantity)
    {
        if (newQuantity < 0)
            throw new ArgumentOutOfRangeException(nameof(newQuantity), "Stock cannot be negative.");
        if (newQuantity < ReservedQuantity)
            throw new InvalidOperationException(
                $"Cannot set stock to {newQuantity}; {ReservedQuantity} unit(s) are reserved by pending orders.");

        StockQuantity = newQuantity;
    }

    public void UpdatePrice(Money newPrice)
    {
        if (newPrice.Amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(newPrice), "Price must be positive.");

        Price = newPrice;
    }

    public void Activate() => IsActive = true;
    public void Deactivate() => IsActive = false;

    /// The first image added automatically becomes the cover, so a book is
    /// never left with images but nothing to show in a listing.
    public BookImage AddImage(string storageKey, string altText)
    {
        if (_images.Count >= MaxImages)
            throw new InvalidOperationException($"A book can have at most {MaxImages} images.");

        var isFirst = _images.Count == 0;
        var nextOrder = isFirst ? 0 : _images.Max(i => i.DisplayOrder) + 1;

        var image = BookImage.Create(storageKey, altText.Trim(), nextOrder, isFirst);
        _images.Add(image);

        return image;
    }

    /// Returns the removed image's storage key so the caller can delete the
    /// actual file. If the cover was removed, the next image is promoted,
    /// so a book with images always has a cover.
    public string RemoveImage(int imageId)
    {
        var image = _images.FirstOrDefault(i => i.Id == imageId)
            ?? throw new InvalidOperationException($"Image {imageId} does not belong to this book.");

        var wasCover = image.IsCover;
        _images.Remove(image);

        if (wasCover && _images.Count > 0)
            _images.OrderBy(i => i.DisplayOrder).First().SetCover(true);

        return image.StorageKey;
    }

    public void SetCoverImage(int imageId)
    {
        var image = _images.FirstOrDefault(i => i.Id == imageId)
            ?? throw new InvalidOperationException($"Image {imageId} does not belong to this book.");

        foreach (var other in _images)
            other.SetCover(false);

        image.SetCover(true);
    }

    /// Full reorder from an ordered list of image ids. Rejects partial lists
    /// outright rather than guessing where unlisted images should land.
    public void ReorderImages(IReadOnlyList<int> imageIdsInOrder)
    {
        if (imageIdsInOrder.Count != _images.Count ||
            imageIdsInOrder.Distinct().Count() != imageIdsInOrder.Count ||
            imageIdsInOrder.Any(id => _images.All(i => i.Id != id)))
        {
            throw new InvalidOperationException(
                "The reorder list must contain every image of this book exactly once.");
        }

        for (var i = 0; i < imageIdsInOrder.Count; i++)
            _images.First(img => img.Id == imageIdsInOrder[i]).SetDisplayOrder(i);
    }
}