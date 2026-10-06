using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Common;
using Microsoft.Extensions.Caching.Memory;

namespace BookStore.Application.Store;

/// Home hero «أرقام الثقة». Every home visit asks, the numbers barely move:
/// cached for 10 minutes.
public sealed record GetStoreStatsQuery : IQuery<StoreStatsDto>;

public sealed class GetStoreStatsQueryHandler(IStoreStatsQueries statsQueries, IMemoryCache cache)
    : IQueryHandler<GetStoreStatsQuery, StoreStatsDto>
{
    private const string CacheKey = "store-stats";

    public async Task<Result<StoreStatsDto>> Handle(GetStoreStatsQuery query, CancellationToken ct)
    {
        var stats = await cache.GetOrCreateAsync(CacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
            return statsQueries.GetAsync(ct);
        });

        return Result.Success(stats!);
    }
}