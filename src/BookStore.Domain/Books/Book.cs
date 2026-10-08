using BookStore.Domain.Books.Events;
using BookStore.Domain.Common;

namespace BookStore.Domain.Books;

public sealed class Book : AggregateRoot<int>
{
    public const int MaxImages = 8;
    public const int MaxMuhaqqiqs = 6;
    public const int MaxHighlights = 12;
    public const int MaxHighlightLength = 200;
    public const int MaxRelatedBooks = 12;
    public const int MaxEditionLabelLength = 100;
    public const int MaxVolumes = 500;

    public ReaderLevel? Level { get; private set; }
    public int? Volumes { get; private set; }

    /// The crossed-out "was" price, in the same currency as Price. Null when
    /// there's no discount. Always strictly higher than Price when set.
    public decimal? CompareAtPrice { get; private set; }

    public bool InstallmentsAllowed { get; private set; }

    private readonly List<string> _highlights = [];
    /// «أبرز موضوعات الكتاب», in display order.
    public IReadOnlyCollection<string> Highlights => _highlights.AsReadOnly();

    public BookBadges Badges { get; private set; }

    /// Short label for the edition picker, e.g. «الكاملة ٦ مجلدات».
    public string? EditionLabel { get; private set; }

    /// Books sharing this id are editions of the same work. Null when the book
    /// has no other editions.
    public int? EditionGroupId { get; private set; }

    private readonly List<BookRelation> _related = [];
    public IReadOnlyCollection<BookRelation> Related => _related.AsReadOnly();

    public IReadOnlyList<int> OrderedRelatedBookIds =>
        _related.OrderBy(r => r.DisplayOrder).Select(r => r.RelatedBookId).ToList();

    public decimal? SavingsAmount =>
        CompareAtPrice is { } was && was > Price.Amount ? was - Price.Amount : null;

    public int? SavingsPercent =>
        SavingsAmount is { } saved && CompareAtPrice is { } was
            ? (int)Math.Round(saved / was * 100, MidpointRounding.AwayFromZero)
            : null;
    public int? CategoryId { get; private set; }

    public string Title { get; private set; } = string.Empty;
    public string? Subtitle { get; private set; }
    public string Author { get; private set; } = string.Empty;
    public Slug Slug { get; private set; } = null!;
    public string Isbn { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public const int DefaultLowStockThreshold = 5;
    public int LowStockThreshold { get; private set; }
    /// Set when an alert has gone out for the current low-stock episode;
    /// cleared when stock recovers above the threshold. Written only by the
    /// low-stock scan, through the repository.
    public DateTimeOffset? LowStockAlertedAtUtc { get; private set; }
    public bool IsLowStock => IsActive && AvailableToSell <= LowStockThreshold;
    public BookFormat Format { get; private set; }
    public int PageCount { get; private set; }
    public string Language { get; private set; } = string.Empty; // ISO 639-1, e.g. "tr", "en"
    public string? Publisher { get; private set; }
    public DateOnly? PublicationDate { get; private set; }
    public BookDimensions Dimensions { get; private set; } = null!;

    public Money Price { get; private set; } = null!;

    public int StockQuantity { get; private set; }
    public int ReservedQuantity { get; private set; }
    private readonly List<BookMuhaqqiq> _muhaqqiqs = [];
    public IReadOnlyCollection<BookMuhaqqiq> Muhaqqiqs => _muhaqqiqs.AsReadOnly();
    public IReadOnlyList<int> OrderedMuhaqqiqIds =>
    _muhaqqiqs.OrderBy(m => m.DisplayOrder).Select(m => m.MuhaqqiqId).ToList();
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

        var book = new Book
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
            IsActive = true,
            LowStockThreshold = DefaultLowStockThreshold
        };

        book.RebuildSearchIndex();
        return book;
    }

    public int AvailableToSell => StockQuantity - ReservedQuantity;

    public BookImage? CoverImage => _images.FirstOrDefault(i => i.IsCover);

    /// Normalised copies used only by catalog search (see SearchNormalizer).
    /// Rebuilt automatically whenever a searchable field changes.
    public string SearchTitle { get; private set; } = string.Empty;
    public string SearchText { get; private set; } = string.Empty;

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

        RebuildSearchIndex();
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


    public void UpdatePrice(Money newPrice)
    {
        if (newPrice.Amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(newPrice), "Price must be positive.");

        var oldPrice = Price;
        Price = newPrice;

        if (CompareAtPrice is { } was && was <= newPrice.Amount)
            CompareAtPrice = null;

        // Only real drops on visible books. Re-saving the same price, or
        // raising it, notifies nobody.
        if (IsActive && newPrice.Amount < oldPrice.Amount)
            Raise(new BookPriceDroppedDomainEvent(Id, oldPrice.Amount, newPrice.Amount, newPrice.Currency, DateTimeOffset.UtcNow));
    }

    public void Activate()
    {
        var wasInactive = !IsActive;
        var wasUnavailable = !IsActive || AvailableToSell <= 0;
        IsActive = true;

        if (wasUnavailable && AvailableToSell > 0)
            Raise(new BookBackInStockDomainEvent(Id, Title, DateTimeOffset.UtcNow));

        // A hidden book going live counts as "new" for its muhaqqiqs' followers.
        // Each (book, muhaqqiq) pair notifies once ever, so hiding and showing
        // the book again re-raises this event but notifies nobody twice.
        if (wasInactive && _muhaqqiqs.Count > 0)
            Raise(new MuhaqqiqWorkAddedDomainEvent(Id, OrderedMuhaqqiqIds, DateTimeOffset.UtcNow));
    }

    public void Deactivate() => IsActive = false;

    /// The first image added automatically becomes the cover, so a book is
    /// never left with images but nothing to show in a listing.
    public BookImage AddImage(
        string storageKey, string altText,
        int? width = null, int? height = null, IReadOnlyList<int>? variantWidths = null)
    {
        if (_images.Count >= MaxImages)
            throw new InvalidOperationException($"A book can have at most {MaxImages} images.");

        var isFirst = _images.Count == 0;
        var nextOrder = isFirst ? 0 : _images.Max(i => i.DisplayOrder) + 1;

        var image = BookImage.Create(storageKey, altText.Trim(), nextOrder, isFirst, width, height, variantWidths);
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
    public void Restock(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentOutOfRangeException(nameof(quantity));

        var wasOutOfStock = AvailableToSell <= 0;
        StockQuantity += quantity;

        RaiseIfBackInStock(wasOutOfStock);
    }

    public void SetStockQuantity(int newQuantity)
    {
        if (newQuantity < 0)
            throw new ArgumentOutOfRangeException(nameof(newQuantity), "Stock cannot be negative.");
        if (newQuantity < ReservedQuantity)
            throw new InvalidOperationException(
                $"Cannot set stock to {newQuantity}; {ReservedQuantity} unit(s) are reserved by pending orders.");

        var wasOutOfStock = AvailableToSell <= 0;
        StockQuantity = newQuantity;

        RaiseIfBackInStock(wasOutOfStock);
    }

    /// Fires only on the 0 -> positive transition, so routine restocks of an
    /// already-available book don't re-notify the waiting list.
    private void RaiseIfBackInStock(bool wasOutOfStock)
    {
        if (wasOutOfStock && AvailableToSell > 0 && IsActive)
            Raise(new BookBackInStockDomainEvent(Id, Title, DateTimeOffset.UtcNow));
    }
    public void SetLowStockThreshold(int threshold)
    {
        if (threshold is < 0 or > 10_000)
            throw new ArgumentOutOfRangeException(nameof(threshold), "Threshold must be between 0 and 10,000.");

        LowStockThreshold = threshold;
    }

    /// Updates the existing link rows in place instead of clearing and re-adding
    /// them. EF tracks owned rows by key; removing and re-adding the same
    /// (BookId, MuhaqqiqId) in one save makes it throw "another instance with
    /// the same key is already being tracked".
    public void SetTaxonomy(int? categoryId, IReadOnlyList<int> muhaqqiqIds)
    {
        if (muhaqqiqIds.Count > MaxMuhaqqiqs)
            throw new ArgumentException($"A book can credit at most {MaxMuhaqqiqs} muhaqqiqs.", nameof(muhaqqiqIds));
        if (muhaqqiqIds.Distinct().Count() != muhaqqiqIds.Count)
            throw new ArgumentException("Each muhaqqiq can be credited only once.", nameof(muhaqqiqIds));

        var addedMuhaqqiqIds = muhaqqiqIds.Where(id => _muhaqqiqs.All(link => link.MuhaqqiqId != id)).ToList();

        CategoryId = categoryId;

        _muhaqqiqs.RemoveAll(link => !muhaqqiqIds.Contains(link.MuhaqqiqId));

        for (var i = 0; i < muhaqqiqIds.Count; i++)
        {
            var existing = _muhaqqiqs.FirstOrDefault(link => link.MuhaqqiqId == muhaqqiqIds[i]);

            if (existing is not null)
                existing.SetDisplayOrder(i);
            else
                _muhaqqiqs.Add(BookMuhaqqiq.Create(muhaqqiqIds[i], i));
        }

        if (IsActive && addedMuhaqqiqIds.Count > 0)
            Raise(new MuhaqqiqWorkAddedDomainEvent(Id, addedMuhaqqiqIds, DateTimeOffset.UtcNow));
    }

    public void SetMerchandising(
    ReaderLevel? level,
    int? volumes,
    decimal? compareAtPrice,
    bool installmentsAllowed,
    IEnumerable<string> highlights,
    BookBadges badges,
    string? editionLabel)
    {
        if (volumes is <= 0 or > MaxVolumes)
            throw new ArgumentOutOfRangeException(nameof(volumes), $"Volumes must be between 1 and {MaxVolumes}.");
        if (compareAtPrice is { } was && was <= Price.Amount)
            throw new ArgumentException("The old price must be higher than the current price.", nameof(compareAtPrice));

        var cleanedHighlights = highlights
            .Where(h => !string.IsNullOrWhiteSpace(h))
            .Select(h => h.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (cleanedHighlights.Count > MaxHighlights)
            throw new ArgumentException($"At most {MaxHighlights} highlights.", nameof(highlights));
        if (cleanedHighlights.Any(h => h.Length > MaxHighlightLength))
            throw new ArgumentException($"Each highlight can be at most {MaxHighlightLength} characters.", nameof(highlights));

        var trimmedLabel = string.IsNullOrWhiteSpace(editionLabel) ? null : editionLabel.Trim();
        if (trimmedLabel is { Length: > MaxEditionLabelLength })
            throw new ArgumentException($"Edition label can be at most {MaxEditionLabelLength} characters.", nameof(editionLabel));

        Level = level;
        Volumes = volumes;
        CompareAtPrice = compareAtPrice;
        InstallmentsAllowed = installmentsAllowed;
        Badges = badges;
        EditionLabel = trimmedLabel;

        _highlights.Clear();
        _highlights.AddRange(cleanedHighlights);

        RebuildSearchIndex();
    }

    /// Group membership rules that involve OTHER books (a book can't already be
    /// in a different group; a group of one dissolves) live in the handler,
    /// which can see them.
    public void JoinEditionGroup(int groupId) => EditionGroupId = groupId;

    public void LeaveEditionGroup() => EditionGroupId = null;

    /// Same in-place update as SetTaxonomy, for the same EF reason: removing and
    /// re-adding an owned row with the same key in one save throws.
    public void SetRelatedBooks(IReadOnlyList<int> relatedBookIds)
    {
        if (relatedBookIds.Count > MaxRelatedBooks)
            throw new ArgumentException($"At most {MaxRelatedBooks} related books.", nameof(relatedBookIds));
        if (relatedBookIds.Distinct().Count() != relatedBookIds.Count)
            throw new ArgumentException("Each related book can appear only once.", nameof(relatedBookIds));
        if (relatedBookIds.Contains(Id))
            throw new ArgumentException("A book can't be related to itself.", nameof(relatedBookIds));

        _related.RemoveAll(r => !relatedBookIds.Contains(r.RelatedBookId));

        for (var i = 0; i < relatedBookIds.Count; i++)
        {
            var existing = _related.FirstOrDefault(r => r.RelatedBookId == relatedBookIds[i]);

            if (existing is not null)
                existing.SetDisplayOrder(i);
            else
                _related.Add(BookRelation.Create(relatedBookIds[i], i));
        }
    }

    /// Category and muhaqqiq names are deliberately NOT copied in: they're
    /// matched at query time, so renaming one never leaves stale search text.
    public void RebuildSearchIndex()
    {
        SearchTitle = SearchNormalizer.Normalize($"{Title} {Subtitle}");

        var parts = new[] { Title, Subtitle, Author, Publisher, Isbn, EditionLabel }
            .Concat(_highlights)
            .Where(part => !string.IsNullOrWhiteSpace(part));

        SearchText = SearchNormalizer.Normalize(string.Join(' ', parts));
    }

    public void ReplaceImageRendition(
    int imageId, string storageKey, int width, int height, IReadOnlyList<int> variantWidths)
    {
        var image = _images.FirstOrDefault(i => i.Id == imageId)
            ?? throw new InvalidOperationException($"Image {imageId} does not belong to this book.");

        image.SetRendition(storageKey, width, height, variantWidths);
    }
}