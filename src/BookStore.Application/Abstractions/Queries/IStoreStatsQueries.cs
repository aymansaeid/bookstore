namespace BookStore.Application.Abstractions.Queries;

public sealed record StoreStatsDto(
    int BookCount,
    int MuhaqqiqCount,
    decimal? AverageRating,
    int ReviewCount,
    int CountriesShippedTo);

public interface IStoreStatsQueries
{
    Task<StoreStatsDto> GetAsync(CancellationToken ct = default);
}