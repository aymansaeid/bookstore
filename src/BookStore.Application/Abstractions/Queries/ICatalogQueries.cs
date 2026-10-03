namespace BookStore.Application.Abstractions.Queries;

public interface ICatalogQueries
{
    /// Books directly in each category (not including subcategories).
    Task<IReadOnlyDictionary<int, int>> CountBooksPerCategoryAsync(bool activeBooksOnly, CancellationToken ct = default);

    Task<IReadOnlyDictionary<int, int>> CountBooksPerMuhaqqiqAsync(bool activeBooksOnly, CancellationToken ct = default);
}