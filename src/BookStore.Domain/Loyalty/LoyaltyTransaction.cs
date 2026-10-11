using BookStore.Domain.Common;

namespace BookStore.Domain.Loyalty;

public enum LoyaltyTier
{
    Bronze = 0,
    Silver = 1,
    Gold = 2
}

public enum LoyaltyTransactionType
{
    Earned = 0,
    ReturnClawback = 1,
    Redeemed = 2,
    RedemptionReversed = 3,
    Adjustment = 4
}

/// One change to a customer's points. The balance is the SUM of these rows,
/// never a stored number, so it can't drift from its own history.
public sealed class LoyaltyTransaction : AggregateRoot<int>
{
    public const int MaxNoteLength = 300;

    public int CustomerId { get; private set; }
    public LoyaltyTransactionType Type { get; private set; }

    /// Positive for earned, negative for clawbacks and redemptions.
    public int Points { get; private set; }

    /// "order:BK-..." / "return:42". Unique per (customer, type): an outbox
    /// retry can never award or claw back twice.
    public string ReferenceKey { get; private set; } = string.Empty;

    public string? OrderNumber { get; private set; }
    public string? Note { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    private LoyaltyTransaction() { } // EF Core

    public static LoyaltyTransaction Earned(int customerId, int points, string orderNumber)
    {
        if (points <= 0)
            throw new ArgumentOutOfRangeException(nameof(points), "Earned points must be positive.");

        return New(customerId, LoyaltyTransactionType.Earned, points, $"order:{orderNumber}", orderNumber, null);
    }

    public static LoyaltyTransaction Clawback(int customerId, int points, string orderNumber, int returnRequestId)
    {
        if (points <= 0)
            throw new ArgumentOutOfRangeException(nameof(points), "Clawback points must be positive.");

        return New(customerId, LoyaltyTransactionType.ReturnClawback, -points, $"return:{returnRequestId}", orderNumber, null);
    }

    private static LoyaltyTransaction New(
        int customerId, LoyaltyTransactionType type, int points, string referenceKey, string? orderNumber, string? note) =>
        new()
        {
            CustomerId = customerId,
            Type = type,
            Points = points,
            ReferenceKey = referenceKey,
            OrderNumber = orderNumber,
            Note = note,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };
}