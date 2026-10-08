using BookStore.Application.Books;
using BookStore.Domain.Books;
using BookStore.Domain.Common;
using BookStore.Domain.ReadingPaths;

namespace BookStore.Application.ReadingPaths;

public sealed record PathPricingDto(decimal TotalPrice, int DiscountPercentage, decimal DiscountedPrice, decimal Savings, string Currency);

public sealed record PathCoverDto(int StageNumber, int BookId, string Title, string? CoverThumbnailUrl);

public sealed record ReadingPathSummaryDto(
    int Id, string Slug, string Title, string? Description, ReaderLevel Level, int EstimatedWeeks,
    int StageCount, bool IsFeatured, bool IsMostChosen, int EnrollmentCount,
    IReadOnlyList<PathCoverDto> Covers, PathPricingDto Pricing);

public sealed record PathStageDto(
    int StageNumber, string Reason, int? EstimatedWeeks, BookSummaryDto Book, int PageCount,
    bool Owned, bool Finished, bool IsCurrent);

public sealed record PathProgressDto(
    bool Enrolled, DateTimeOffset? StartedAtUtc, int CompletedStages, int TotalStages, int Percent,
    int? CurrentStageNumber, PathPricingDto RemainingPricing);

public sealed record ReadingPathDto(ReadingPathSummaryDto Summary, IReadOnlyList<PathStageDto> Stages, PathProgressDto? MyProgress);

public sealed record MyReadingPathDto(ReadingPathSummaryDto Summary, PathProgressDto Progress, PathStageDto? NextStage);

public sealed record AdminPathStageDto(int StageNumber, int BookId, string Reason, int? EstimatedWeeks);

public sealed record AdminReadingPathDto(
    int Id, string Slug, string Title, string? Description, ReaderLevel Level, int EstimatedWeeks,
    int DiscountPercentage, bool IsFeatured, int DisplayOrder, bool IsActive,
    IReadOnlyList<AdminPathStageDto> Stages, int EnrollmentCount);

public static class PathPricing
{
    /// The ONE place a path's price is computed. P3b's checkout uses it too.
    public static PathPricingDto Calculate(IEnumerable<Book> books, int discountPercentage, string currency)
    {
        var total = books.Aggregate(Money.Zero(currency), (sum, b) => sum.Add(b.Price));
        var discount = total.PercentageOf(discountPercentage);
        var discounted = total.Subtract(discount);

        return new PathPricingDto(total.Amount, discountPercentage, discounted.Amount, discount.Amount, currency);
    }
}

public static class ReadingPathMappings
{
    public static AdminReadingPathDto ToAdminDto(this ReadingPath p, int enrollmentCount) =>
        new(p.Id, p.Slug.Value, p.Title, p.Description, p.Level, p.EstimatedWeeks,
            p.DiscountPercentage, p.IsFeatured, p.DisplayOrder, p.IsActive,
            p.OrderedStages.Select(s => new AdminPathStageDto(s.StageNumber, s.BookId, s.Reason, s.EstimatedWeeks)).ToList(),
            enrollmentCount);
}

public static class ReadingPathErrors
{
    public static Common.Error NotFound(int id) => Common.Error.NotFound("ReadingPath.NotFound", $"Reading path {id} was not found.");
    public static Common.Error SlugNotFound(string slug) => Common.Error.NotFound("ReadingPath.SlugNotFound", $"No reading path at '{slug}'.");
    public static Common.Error DuplicateSlug(string slug) => Common.Error.Conflict("ReadingPath.DuplicateSlug", $"A path at '{slug}' already exists.");
    public static Common.Error InvalidSlug => Common.Error.Validation("ReadingPath.InvalidSlug", "The title or slug has no usable URL characters.");
    public static Common.Error UnknownBooks(IEnumerable<int> ids) => Common.Error.Validation("ReadingPath.UnknownBooks", $"Unknown book id(s): {string.Join(", ", ids)}.");
    public static Common.Error HasEnrollments(int count) =>
        Common.Error.Conflict("ReadingPath.HasEnrollments", $"{count} customer(s) follow this path. Hide it instead of deleting it.");
    public static Common.Error Invalid(string message) => Common.Error.Validation("ReadingPath.Invalid", message);
}