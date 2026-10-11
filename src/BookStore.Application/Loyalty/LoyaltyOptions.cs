using BookStore.Domain.Loyalty;

namespace BookStore.Application.Loyalty;

public sealed class LoyaltyOptions
{
    public const string SectionName = "Loyalty";

    public bool Enabled { get; init; } = true;

    /// 10 = one point per 10 ₺ of books actually paid.
    public decimal CurrencyPerPoint { get; init; } = 10m;

    /// Points EARNED in the last 12 months needed for each tier.
    public int SilverFromPoints { get; init; } = 200;
    public int GoldFromPoints { get; init; } = 500;

    public LoyaltyTier TierFor(int earnedLast12Months) =>
        earnedLast12Months >= GoldFromPoints ? LoyaltyTier.Gold
        : earnedLast12Months >= SilverFromPoints ? LoyaltyTier.Silver
        : LoyaltyTier.Bronze;

    public (LoyaltyTier Tier, int PointsNeeded)? NextTier(int earnedLast12Months) =>
        TierFor(earnedLast12Months) switch
        {
            LoyaltyTier.Bronze => (LoyaltyTier.Silver, SilverFromPoints - earnedLast12Months),
            LoyaltyTier.Silver => (LoyaltyTier.Gold, GoldFromPoints - earnedLast12Months),
            _ => null
        };
}