using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Coupons;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class CouponRepository(BookStoreDbContext dbContext) : ICouponRepository
{
    public Task<Coupon?> GetByIdAsync(int id, CancellationToken ct = default) =>
        dbContext.Coupons.FirstOrDefaultAsync(c => c.Id == id, ct);

    public Task<Coupon?> GetByCodeAsync(string code, CancellationToken ct = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        return dbContext.Coupons.FirstOrDefaultAsync(c => c.Code == normalized, ct);
    }

    public async Task<IReadOnlyList<Coupon>> ListAsync(CancellationToken ct = default) =>
        await dbContext.Coupons
            .AsNoTracking()
            .OrderByDescending(c => c.ExpiresAtUtc)
            .ToListAsync(ct);

    public Task<bool> CodeExistsAsync(string code, CancellationToken ct = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        return dbContext.Coupons.AnyAsync(c => c.Code == normalized, ct);
    }

    public void Add(Coupon coupon) => dbContext.Coupons.Add(coupon);

    public void Remove(Coupon coupon) => dbContext.Coupons.Remove(coupon);

    public async Task<bool> TryRedeemAsync(string code, CancellationToken ct = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        var now = DateTimeOffset.UtcNow;

        var rowsAffected = await dbContext.Coupons
            .Where(c => c.Code == normalized
                        && c.IsActive
                        && c.ExpiresAtUtc > now
                        && (c.MaxRedemptions == null || c.TimesRedeemed < c.MaxRedemptions))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(c => c.TimesRedeemed, c => c.TimesRedeemed + 1), ct);

        return rowsAffected == 1;
    }
}