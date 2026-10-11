using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Library;
using BookStore.Application.ReadingPaths;
using BookStore.Domain.Books;
using BookStore.Domain.Common;
using BookStore.Domain.ReadingPaths;

namespace BookStore.Application.Orders.Checkout;

public sealed record PathDiscountResult(
    int? ReadingPathId,
    string? PathTitle,
    int DiscountPercentage,
    Money Amount,
    string? Problem,
    IReadOnlyList<int> MissingBookIds)
{
    public static PathDiscountResult None(string currency) => new(null, null, 0, Money.Zero(currency), null, []);
    public bool Applies => Problem is null && ReadingPathId is not null && Amount.Amount > 0;
}

public static class PathDiscountRules
{
    public const string PathUnavailable = "Checkout.PathUnavailable";
    public const string PathIncomplete = "Checkout.PathIncomplete";
    public const string PathAlreadyOwned = "Checkout.PathAlreadyOwned";

    /// visibleStageBooks: the path's ACTIVE books, as the path page shows them.
    /// The discount covers one copy of each book the buyer doesn't own,
    /// priced by PathPricing: the exact function behind remainingPricing.
    public static PathDiscountResult Evaluate(
        ReadingPath path,
        IReadOnlyList<Book> visibleStageBooks,
        IReadOnlySet<int> ownedBookIds,
        IReadOnlySet<int> cartBookIds,
        string currency)
    {
        var required = visibleStageBooks.Where(b => !ownedBookIds.Contains(b.Id)).ToList();

        if (required.Count == 0)
            return Fail(path, currency, PathAlreadyOwned, []);

        var missing = required.Where(b => !cartBookIds.Contains(b.Id)).Select(b => b.Id).ToList();
        if (missing.Count > 0)
            return Fail(path, currency, PathIncomplete, missing);

        var pricing = PathPricing.Calculate(required, path.DiscountPercentage, currency);

        return new PathDiscountResult(
            path.Id, path.Title, path.DiscountPercentage, Money.From(pricing.Savings, currency), null, []);
    }

    private static PathDiscountResult Fail(ReadingPath path, string currency, string problem, IReadOnlyList<int> missing) =>
        new(path.Id, path.Title, path.DiscountPercentage, Money.Zero(currency), problem, missing);
}

public sealed class PathDiscountCalculator(
    IReadingPathRepository pathRepository,
    IBookRepository bookRepository,
    LibraryReader libraryReader)
{
    public async Task<PathDiscountResult> CalculateAsync(
        int? readingPathId, int? customerId, IReadOnlySet<int> cartBookIds, string currency, CancellationToken ct)
    {
        if (readingPathId is not { } pathId)
            return PathDiscountResult.None(currency);

        var path = await pathRepository.GetByIdAsync(pathId, ct);
        if (path is null || !path.IsActive || path.DiscountPercentage == 0)
            return new PathDiscountResult(pathId, path?.Title, 0, Money.Zero(currency), PathDiscountRules.PathUnavailable, []);

        var stageBooks = (await bookRepository.ListByIdsAsync(path.Stages.Select(s => s.BookId).ToList(), ct))
            .Where(b => b.IsActive)
            .ToList();

        // Guests own nothing as far as we know: they need every book.
        IReadOnlySet<int> owned = customerId is { } id
            ? (await libraryReader.LoadAsync(id, ct)).Owned.Keys.ToHashSet()
            : new HashSet<int>();

        return PathDiscountRules.Evaluate(path, stageBooks, owned, cartBookIds, currency);
    }
}