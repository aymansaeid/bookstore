using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Reviews;
using BookStore.Domain.Books;

namespace BookStore.Application.Books;

public sealed record BookImageDto(int Id, string Url, string AltText, int DisplayOrder, bool IsCover);

public sealed record PublicBookDto(
    int Id, string Slug, string Title, string? Subtitle, string Author, string Isbn, string Description,
    string Format, int PageCount, string Language, string? Publisher, DateOnly? PublicationDate,
    int WeightGrams, int HeightMm, int WidthMm, int DepthMm,
    decimal Price, string Currency, bool InStock,
    string? CoverImageUrl, IReadOnlyList<BookImageDto> Images,
    decimal? AverageRating, int ReviewCount);

public sealed record AdminBookDto(
    int Id, string Slug, string Title, string? Subtitle, string Author, string Isbn, string Description,
    string Format, int PageCount, string Language, string? Publisher, DateOnly? PublicationDate,
    int WeightGrams, int HeightMm, int WidthMm, int DepthMm,
    decimal Price, string Currency,
    int StockQuantity, int ReservedQuantity, int AvailableToSell, bool IsActive,
    IReadOnlyList<BookImageDto> Images, int LowStockThreshold, bool IsLowStock);

public static class BookMappings
{
    public static PublicBookDto ToPublicDto(this Book b, IFileStorage storage, RatingSnapshot? rating = null) =>
        new(b.Id, b.Slug.Value, b.Title, b.Subtitle, b.Author, b.Isbn, b.Description,
            b.Format.ToString(), b.PageCount, b.Language, b.Publisher, b.PublicationDate,
            b.Dimensions.WeightGrams, b.Dimensions.HeightMm, b.Dimensions.WidthMm, b.Dimensions.DepthMm,
            b.Price.Amount, b.Price.Currency, b.AvailableToSell > 0,
            b.CoverImage is null ? null : storage.GetPublicUrl(b.CoverImage.StorageKey),
            b.OrderedImages.Select(i => i.ToDto(storage)).ToList(),
            rating?.AverageRating, rating?.ReviewCount ?? 0);

    public static AdminBookDto ToAdminDto(this Book b, IFileStorage storage) =>
        new(b.Id, b.Slug.Value, b.Title, b.Subtitle, b.Author, b.Isbn, b.Description,
            b.Format.ToString(), b.PageCount, b.Language, b.Publisher, b.PublicationDate,
            b.Dimensions.WeightGrams, b.Dimensions.HeightMm, b.Dimensions.WidthMm, b.Dimensions.DepthMm,
            b.Price.Amount, b.Price.Currency,
            b.StockQuantity, b.ReservedQuantity, b.AvailableToSell, b.IsActive,
            b.OrderedImages.Select(i => i.ToDto(storage)).ToList(), b.LowStockThreshold, b.IsLowStock);

    public static BookImageDto ToDto(this BookImage i, IFileStorage storage) =>
        new(i.Id, storage.GetPublicUrl(i.StorageKey), i.AltText, i.DisplayOrder, i.IsCover);
}