using BookStore.Application.Abstractions.Queries;
using BookStore.Domain.Reviews;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Queries;

public sealed class StoreStatsQueries(BookStoreDbContext dbContext) : IStoreStatsQueries
{
    public async Task<StoreStatsDto> GetAsync(CancellationToken ct = default)
    {
        var bookCount = await dbContext.Books.CountAsync(b => b.IsActive, ct);
        var muhaqqiqCount = await dbContext.Muhaqqiqs.CountAsync(m => m.IsActive, ct);

        var approved = dbContext.Reviews.Where(r => r.Status == ReviewStatus.Approved);
        var reviewCount = await approved.CountAsync(ct);
        var average = await approved.AverageAsync(r => (decimal?)r.Rating, ct);

        // Country lists are JSON per zone and there are few zones: count in memory.
        var zones = await dbContext.ShippingZones.AsNoTracking().Where(z => z.IsActive).ToListAsync(ct);
        var countries = zones.SelectMany(z => z.CountryCodes).Distinct().Count();

        return new StoreStatsDto(
            bookCount,
            muhaqqiqCount,
            average is null ? null : Math.Round(average.Value, 1, MidpointRounding.AwayFromZero),
            reviewCount,
            countries);
    }
}