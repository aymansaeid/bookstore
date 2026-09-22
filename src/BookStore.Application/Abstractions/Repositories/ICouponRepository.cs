using BookStore.Domain.Coupons;

namespace BookStore.Application.Abstractions.Repositories;

public interface ICouponRepository
{
    Task<Coupon?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Coupon?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<IReadOnlyList<Coupon>> ListAsync(CancellationToken ct = default);
    Task<bool> CodeExistsAsync(string code, CancellationToken ct = default);
    void Add(Coupon coupon);
    void Remove(Coupon coupon);

    /// <summary>
    /// Atomic conditional UPDATE: increments TimesRedeemed only if the
    /// coupon is active, unexpired, and under its usage cap.
    /// </summary>

    /// Gives one use back to a coupon (its order was cancelled).
    Task ReleaseRedemptionAsync(string code, CancellationToken ct = default);
    Task<bool> TryRedeemAsync(string code, CancellationToken ct = default);
}