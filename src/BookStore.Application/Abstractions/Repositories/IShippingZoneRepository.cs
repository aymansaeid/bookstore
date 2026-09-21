using BookStore.Domain.Shipping;

namespace BookStore.Application.Abstractions.Repositories;

public interface IShippingZoneRepository
{
    Task<ShippingZone?> GetByCountryCodeAsync(string countryCode, CancellationToken ct = default);
}