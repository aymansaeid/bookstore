using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;

namespace BookStore.Application.Shipping.Queries;

public sealed record GetAdminShippingZonesQuery : IQuery<IReadOnlyList<AdminShippingZoneDto>>;

public sealed class GetAdminShippingZonesQueryHandler(IShippingZoneRepository repository)
    : IQueryHandler<GetAdminShippingZonesQuery, IReadOnlyList<AdminShippingZoneDto>>
{
    public async Task<Result<IReadOnlyList<AdminShippingZoneDto>>> Handle(
        GetAdminShippingZonesQuery query, CancellationToken ct)
    {
        var zones = await repository.ListAsync(includeInactive: true, ct);
        return Result.Success<IReadOnlyList<AdminShippingZoneDto>>(zones.Select(z => z.ToAdminDto()).ToList());
    }
}

public sealed record GetAdminShippingZoneByIdQuery(int ZoneId) : IQuery<AdminShippingZoneDto>;

public sealed class GetAdminShippingZoneByIdQueryHandler(IShippingZoneRepository repository)
    : IQueryHandler<GetAdminShippingZoneByIdQuery, AdminShippingZoneDto>
{
    public async Task<Result<AdminShippingZoneDto>> Handle(GetAdminShippingZoneByIdQuery query, CancellationToken ct)
    {
        var zone = await repository.GetByIdAsync(query.ZoneId, ct);
        return zone is null
            ? Result.Failure<AdminShippingZoneDto>(ShippingZoneErrors.NotFound(query.ZoneId))
            : Result.Success(zone.ToAdminDto());
    }
}

public sealed record GetPublicShippingRatesQuery : IQuery<IReadOnlyList<PublicShippingRateDto>>;

public sealed class GetPublicShippingRatesQueryHandler(IShippingZoneRepository repository)
    : IQueryHandler<GetPublicShippingRatesQuery, IReadOnlyList<PublicShippingRateDto>>
{
    public async Task<Result<IReadOnlyList<PublicShippingRateDto>>> Handle(
        GetPublicShippingRatesQuery query, CancellationToken ct)
    {
        var zones = await repository.ListAsync(includeInactive: false, ct);

        var rates = zones
            .SelectMany(z => z.ToPublicRates())
            .OrderBy(r => r.CountryName)
            .ToList();

        return Result.Success<IReadOnlyList<PublicShippingRateDto>>(rates);
    }
}