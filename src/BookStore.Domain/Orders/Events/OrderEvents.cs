using BookStore.Domain.Common;

namespace BookStore.Domain.Orders.Events;

/// A real record, not a ValueTuple: tuples serialize to {} because their
/// members are fields, and the outbox stores events as JSON.
public sealed record OrderLineSnapshot(int BookId, int Quantity);

public sealed record OrderPaidDomainEvent(
    int OrderId,
    string OrderNumber,
    string CustomerEmail,
    IReadOnlyCollection<OrderLineSnapshot> Lines,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;

public sealed record OrderExpiredDomainEvent(
    int OrderId,
    IReadOnlyCollection<OrderLineSnapshot> Lines,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;

public sealed record OrderCancelledDomainEvent(
    int OrderId,
    string OrderNumber,
    string CustomerEmail,
    bool WasPaid,
    IReadOnlyCollection<OrderLineSnapshot> Lines,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;

public sealed record OrderShippedDomainEvent(
    int OrderId,
    string OrderNumber,
    string CustomerEmail,
    string Carrier,
    string TrackingNumber,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;