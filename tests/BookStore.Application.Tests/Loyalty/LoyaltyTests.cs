using BookStore.Application.Loyalty;
using BookStore.Domain.Loyalty;
using FluentAssertions;

namespace BookStore.Application.Tests.Loyalty;

public class LoyaltyTests
{
    private static readonly LoyaltyOptions Options = new() { CurrencyPerPoint = 10m, SilverFromPoints = 200, GoldFromPoints = 500 };

    [Theory]
    [InlineData(2400, 240)]
    [InlineData(9.99, 0)]   // under one point: nothing, never a fraction
    [InlineData(0, 0)]
    public void PointsFor_RoundsDown(decimal paid, int expected)
    {
        LoyaltyCalculator.PointsFor(paid, 10m).Should().Be(expected);
    }

    [Fact]
    public void FullReturn_TakesBackEverythingLeft()
    {
        LoyaltyCalculator.ClawbackFor(earnedForOrder: 240, alreadyClawedBack: 0, isFullReturn: true, 0, 2400)
            .Should().Be(240);
    }

    [Fact]
    public void PartialReturn_TakesBackItsShare()
    {
        // Returned 810 of 2400 paid: 81 of 240 points.
        LoyaltyCalculator.ClawbackFor(240, 0, isFullReturn: false, refundedMerchandise: 810, merchandisePaid: 2400)
            .Should().Be(81);
    }

    [Fact]
    public void Clawbacks_NeverExceedWhatWasEarned()
    {
        LoyaltyCalculator.ClawbackFor(240, alreadyClawedBack: 200, isFullReturn: false, refundedMerchandise: 2000, merchandisePaid: 2400)
            .Should().Be(40);
    }

    [Theory]
    [InlineData(0, LoyaltyTier.Bronze)]
    [InlineData(199, LoyaltyTier.Bronze)]
    [InlineData(200, LoyaltyTier.Silver)]
    [InlineData(640, LoyaltyTier.Gold)]
    public void Tier_FollowsPointsEarnedThisYear(int earned, LoyaltyTier expected)
    {
        Options.TierFor(earned).Should().Be(expected);
    }

    [Fact]
    public void NextTier_ReportsPointsNeeded_AndNothingAtTheTop()
    {
        Options.NextTier(150).Should().Be((LoyaltyTier.Silver, 50));
        Options.NextTier(640).Should().BeNull();
    }
}