namespace BookStore.Domain.Orders;

public enum CustomerCancelReason
{
    ChangedMind = 0,
    OrderedByMistake = 1,
    FoundBetterPrice = 2,
    DeliveryTooSlow = 3,
    Other = 4
}