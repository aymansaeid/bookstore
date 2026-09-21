using BookStore.Domain.Coupons;

namespace BookStore.Application.Abstractions.Repositories;

public interface ICouponRepository
{
    Task<Coupon?> GetByCodeAsync(string code, CancellationToken ct = default);

    /// <summary>
    /// Atomic conditional UPDATE, same pattern as book stock: increments
    /// TimesRedeemed only if the coupon is active, unexpired, and under its
    /// usage cap. Returns false otherwise.
    ///
    /// Deliberate simplification: this redeems immediately at checkout, not
    /// at payment confirmation. An abandoned cart permanently burns one use
    /// of the coupon. That's the accepted trade-off — a wasted coupon use
    /// on an abandoned cart is a minor cost, unlike overselling a physical
    /// book, so it doesn't get the same reserve/release treatment as stock.
    /// If coupon abuse ever becomes a real problem, revisit this.
    /// </summary>
    Task<bool> TryRedeemAsync(string code, CancellationToken ct = default);
}