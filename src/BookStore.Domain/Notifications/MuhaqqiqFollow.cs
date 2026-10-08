using BookStore.Domain.Common;

namespace BookStore.Domain.Notifications;

public sealed class MuhaqqiqFollow : AggregateRoot<int>
{
    public int CustomerId { get; private set; }
    public int MuhaqqiqId { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    private MuhaqqiqFollow() { } // EF Core

    public static MuhaqqiqFollow Create(int customerId, int muhaqqiqId) =>
        new() { CustomerId = customerId, MuhaqqiqId = muhaqqiqId, CreatedAtUtc = DateTimeOffset.UtcNow };
}