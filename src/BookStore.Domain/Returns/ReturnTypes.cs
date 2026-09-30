namespace BookStore.Domain.Returns;

public enum ReturnStatus
{
    Requested = 0,
    Approved = 1,
    Rejected = 2,
    Completed = 3,
    CancelledByCustomer = 4
}

public enum ReturnReason
{
    ChangedMind = 0,
    ArrivedDamaged = 1,
    WrongItem = 2,
    Other = 3
}

public enum ReturnItemCondition
{
    /// Goes back on the shelf, with a ReturnRestock ledger entry.
    Resellable = 0,

    /// Never re-enters stock. Recorded on the return line only.
    Damaged = 1
}

public sealed record ReturnItem(int BookId, int Quantity);