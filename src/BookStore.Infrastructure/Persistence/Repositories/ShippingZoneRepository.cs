using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Shipping;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class ShippingZoneRepository(BookStoreDbContext dbContext) : IShippingZoneRepository
{
    public Task<ShippingZone?> GetByCountryCodeAsync(string countryCode, CancellationToken ct = default) =>
        dbContext.ShippingZones
            .Where(z => z.IsActive)
            .FirstOrDefaultAsync(z => z.CountryCodes.Contains(countryCode.ToUpperInvariant()), ct);
}