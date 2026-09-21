using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Shipping;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class ShippingZoneRepository(BookStoreDbContext dbContext) : IShippingZoneRepository
{
    public Task<ShippingZone?> GetByIdAsync(int id, CancellationToken ct = default) =>
        dbContext.ShippingZones.FirstOrDefaultAsync(z => z.Id == id, ct);

    public Task<ShippingZone?> GetByCountryCodeAsync(string countryCode, CancellationToken ct = default) =>
        dbContext.ShippingZones
            .Where(z => z.IsActive)
            .FirstOrDefaultAsync(z => z.CountryCodes.Contains(countryCode.ToUpperInvariant()), ct);

    public async Task<IReadOnlyList<ShippingZone>> ListAsync(bool includeInactive, CancellationToken ct = default) =>
        await dbContext.ShippingZones
            .AsNoTracking()
            .Where(z => includeInactive || z.IsActive)
            .OrderBy(z => z.Name)
            .ToListAsync(ct);

    public void Add(ShippingZone zone) => dbContext.ShippingZones.Add(zone);

    public void Remove(ShippingZone zone) => dbContext.ShippingZones.Remove(zone);
}