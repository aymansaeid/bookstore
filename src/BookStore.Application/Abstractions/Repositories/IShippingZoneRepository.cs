using BookStore.Domain.Shipping;

namespace BookStore.Application.Abstractions.Repositories;

public interface IShippingZoneRepository
{
    Task<ShippingZone?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<ShippingZone?> GetByCountryCodeAsync(string countryCode, CancellationToken ct = default);
    Task<IReadOnlyList<ShippingZone>> ListAsync(bool includeInactive, CancellationToken ct = default);
    void Add(ShippingZone zone);
    void Remove(ShippingZone zone);
}