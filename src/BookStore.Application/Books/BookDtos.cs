using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Catalog;
using BookStore.Application.Reviews;
using BookStore.Domain.Books;

namespace BookStore.Application.Books;

public sealed record ImageVariantDto(int Width, string Url);

public sealed record BookImageDto(
    int Id, string Url, string AltText, int DisplayOrder, bool IsCover,
    int? Width, int? Height, IReadOnlyList<ImageVariantDto> Variants, string SrcSet);

/// Compact card for edition pickers and "complements your library".
public sealed record BookSummaryDto(
    int Id, string Slug, string Title, string Author, string? EditionLabel, int? Volumes,
    decimal Price, decimal? OldPrice, string Currency, bool InStock,
    string? CoverImageUrl, decimal? AverageRating, int ReviewCount,
    string? CoverImageSrcSet);

/// Only loaded for a single book (the book page); null in list responses.
public sealed record BookPageExtras(IReadOnlyList<BookSummaryDto> Editions, IReadOnlyList<BookSummaryDto> Related);

public sealed record PublicBookDto(
    int Id, string Slug, string Title, string? Subtitle, string Author, string Isbn, string Description,
    string Format, int PageCount, string Language, string? Publisher, DateOnly? PublicationDate,
    int WeightGrams, int HeightMm, int WidthMm, int DepthMm,
    decimal Price, string Currency, bool InStock,
    string? CoverImageUrl, IReadOnlyList<BookImageDto> Images,
    decimal? AverageRating, int ReviewCount,
    BookCategoryDto? Category, IReadOnlyList<MuhaqqiqRefDto> Muhaqqiqs,
    ReaderLevel? Level, int? Volumes,
    decimal? OldPrice, decimal? SavingsAmount, int? SavingsPercent,
    bool InstallmentsAllowed, IReadOnlyList<string> Highlights, IReadOnlyList<string> Badges,
    string? EditionLabel,
    IReadOnlyList<BookSummaryDto>? Editions, IReadOnlyList<BookSummaryDto>? Related,
    string? CoverImageSrcSet);

public sealed record AdminBookDto(
    int Id, string Slug, string Title, string? Subtitle, string Author, string Isbn, string Description,
    string Format, int PageCount, string Language, string? Publisher, DateOnly? PublicationDate,
    int WeightGrams, int HeightMm, int WidthMm, int DepthMm,
    decimal Price, string Currency,
    int StockQuantity, int ReservedQuantity, int AvailableToSell, bool IsActive,
    IReadOnlyList<BookImageDto> Images,
    int LowStockThreshold, bool IsLowStock,
    int? CategoryId, IReadOnlyList<int> MuhaqqiqIds,
    ReaderLevel? Level, int? Volumes, decimal? CompareAtPrice, bool InstallmentsAllowed,
    IReadOnlyList<string> Highlights, IReadOnlyList<string> Badges, string? EditionLabel,
    int? EditionGroupId, IReadOnlyList<int> RelatedBookIds);

public static class BookMappings
{
    public static PublicBookDto ToPublicDto(
        this Book b,
        IFileStorage storage,
        RatingSnapshot? rating = null,
        TaxonomyLookup? taxonomy = null,
        BookPageExtras? extras = null)
    {
        var lookup = taxonomy ?? TaxonomyLookup.Empty;

        return new PublicBookDto(
            b.Id, b.Slug.Value, b.Title, b.Subtitle, b.Author, b.Isbn, b.Description,
            b.Format.ToString(), b.PageCount, b.Language, b.Publisher, b.PublicationDate,
            b.Dimensions.WeightGrams, b.Dimensions.HeightMm, b.Dimensions.WidthMm, b.Dimensions.DepthMm,
            b.Price.Amount, b.Price.Currency, b.AvailableToSell > 0,
            CoverUrl(b, storage),
            b.OrderedImages.Select(i => i.ToDto(storage)).ToList(),
            rating?.AverageRating, rating?.ReviewCount ?? 0,
            lookup.CategoryFor(b), lookup.MuhaqqiqsFor(b),
            b.Level, b.Volumes,
            b.SavingsAmount is null ? null : b.CompareAtPrice, b.SavingsAmount, b.SavingsPercent,
            b.InstallmentsAllowed, b.Highlights.ToList(), BadgeNames(b.Badges),
            b.EditionLabel,
            extras?.Editions, extras?.Related,
            CoverSrcSet(b, storage));
    }

    public static BookSummaryDto ToSummaryDto(this Book b, IFileStorage storage, RatingSnapshot? rating) =>
        new(b.Id, b.Slug.Value, b.Title, b.Author, b.EditionLabel, b.Volumes,
            b.Price.Amount, b.SavingsAmount is null ? null : b.CompareAtPrice, b.Price.Currency,
            b.AvailableToSell > 0, CoverUrl(b, storage), rating?.AverageRating, rating?.ReviewCount ?? 0,
            CoverSrcSet(b, storage));

    public static AdminBookDto ToAdminDto(this Book b, IFileStorage storage) =>
        new(b.Id, b.Slug.Value, b.Title, b.Subtitle, b.Author, b.Isbn, b.Description,
            b.Format.ToString(), b.PageCount, b.Language, b.Publisher, b.PublicationDate,
            b.Dimensions.WeightGrams, b.Dimensions.HeightMm, b.Dimensions.WidthMm, b.Dimensions.DepthMm,
            b.Price.Amount, b.Price.Currency,
            b.StockQuantity, b.ReservedQuantity, b.AvailableToSell, b.IsActive,
            b.OrderedImages.Select(i => i.ToDto(storage)).ToList(),
            b.LowStockThreshold, b.IsLowStock,
            b.CategoryId, b.OrderedMuhaqqiqIds,
            b.Level, b.Volumes, b.CompareAtPrice, b.InstallmentsAllowed,
            b.Highlights.ToList(), BadgeNames(b.Badges), b.EditionLabel,
            b.EditionGroupId, b.OrderedRelatedBookIds);

    public static BookImageDto ToDto(this BookImage i, IFileStorage storage)
    {
        var masterUrl = storage.GetPublicUrl(i.StorageKey);
        var variants = i.VariantWidths
            .Select(w => new ImageVariantDto(w, storage.GetPublicUrl(i.VariantStorageKey(w))))
            .ToList();

        return new BookImageDto(
            i.Id, masterUrl, i.AltText, i.DisplayOrder, i.IsCover,
            i.Width, i.Height, variants, BuildSrcSet(masterUrl, i.Width, variants));
    }

    public static string? CoverUrl(Book b, IFileStorage storage) =>
        b.CoverImage is null ? null : storage.GetPublicUrl(b.CoverImage.StorageKey);

    public static string? CoverSrcSet(Book b, IFileStorage storage) =>
        b.CoverImage?.ToDto(storage).SrcSet;

    /// Smallest variant at least `preferredWidth` wide; the master if there's
    /// none (older images, or small originals).
    public static string? CoverThumbnailUrl(Book b, IFileStorage storage, int preferredWidth = 300)
    {
        if (b.CoverImage is not { } cover)
            return null;

        var width = cover.VariantWidths.Where(w => w >= preferredWidth).DefaultIfEmpty().Min();
        return width == 0
            ? storage.GetPublicUrl(cover.StorageKey)
            : storage.GetPublicUrl(cover.VariantStorageKey(width));
    }

    private static string BuildSrcSet(string masterUrl, int? masterWidth, IReadOnlyList<ImageVariantDto> variants)
    {
        var candidates = variants.Select(v => $"{v.Url} {v.Width}w").ToList();
        if (masterWidth is { } w)
            candidates.Add($"{masterUrl} {w}w");

        // Older images with no known width: a single plain candidate.
        return candidates.Count == 0 ? masterUrl : string.Join(", ", candidates);
    }

    private static IReadOnlyList<string> BadgeNames(BookBadges badges) =>
        Enum.GetValues<BookBadges>()
            .Where(flag => flag != BookBadges.None && badges.HasFlag(flag))
            .Select(flag => flag.ToString())
            .ToList();
}