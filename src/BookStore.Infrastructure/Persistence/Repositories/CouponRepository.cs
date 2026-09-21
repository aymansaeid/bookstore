using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Coupons;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class CouponRepository(BookStoreDbContext dbContext) : ICouponRepository
{
    public Task<Coupon?> GetByCodeAsync(string code, CancellationToken ct = default) =>
        dbContext.Coupons.FirstOrDefaultAsync(c => c.Code == code.ToUpperInvariant(), ct);

    public async Task<bool> TryRedeemAsync(string code, CancellationToken ct = default)
    {
        var normalizedCode = code.ToUpperInvariant();
        var now = DateTimeOffset.UtcNow;

        var rowsAffected = await dbContext.Coupons
            .Where(c => c.Code == normalizedCode
                        && c.IsActive
                        && c.ExpiresAtUtc > now
                        && (c.MaxRedemptions == null || c.TimesRedeemed < c.MaxRedemptions))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(c => c.TimesRedeemed, c => c.TimesRedeemed + 1), ct);

        return rowsAffected == 1;
    }
}