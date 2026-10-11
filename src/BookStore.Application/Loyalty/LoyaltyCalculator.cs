namespace BookStore.Application.Loyalty;

public static class LoyaltyCalculator
{
    /// Points for money actually paid for BOOKS (after all discounts, without
    /// shipping or gift wrap). Rounded down: never award a fraction.
    public static int PointsFor(decimal merchandisePaid, decimal currencyPerPoint) =>
        merchandisePaid <= 0 ? 0 : (int)Math.Floor(merchandisePaid / currencyPerPoint);

    /// Share of an order's points to take back for a return, never more
    /// than what's still left after earlier clawbacks on the same order.
    public static int ClawbackFor(
        int earnedForOrder, int alreadyClawedBack, bool isFullReturn, decimal refundedMerchandise, decimal merchandisePaid)
    {
        var remaining = earnedForOrder - alreadyClawedBack;
        if (remaining <= 0)
            return 0;

        if (isFullReturn || merchandisePaid <= 0)
            return remaining;

        var share = (int)Math.Round(earnedForOrder * refundedMerchandise / merchandisePaid, MidpointRounding.AwayFromZero);
        return Math.Clamp(share, 0, remaining);
    }
}