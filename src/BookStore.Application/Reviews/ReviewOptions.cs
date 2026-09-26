namespace BookStore.Application.Reviews;

public sealed class ReviewOptions
{
    public const string SectionName = "Reviews";

    /// A Shipped order becomes reviewable this many days after shipping,
    /// even if nobody ever marked it Delivered.
    public int ShippedOrderEligibleAfterDays { get; init; } = 14;
}