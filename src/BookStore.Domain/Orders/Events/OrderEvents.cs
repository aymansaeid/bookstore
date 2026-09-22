using BookStore.Domain.Common;

namespace BookStore.Domain.Orders.Events;

public sealed record OrderPaidDomainEvent(
    int OrderId,
    string OrderNumber,
    string CustomerEmail,
    IReadOnlyCollection<(int BookId, int Quantity)> Lines,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;

public sealed record OrderExpiredDomainEvent(
    int OrderId,
    IReadOnlyCollection<(int BookId, int Quantity)> Lines,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;

public sealed record OrderCancelledDomainEvent(
    int OrderId,
    string OrderNumber,
    string CustomerEmail,
    bool WasPaid,
    IReadOnlyCollection<(int BookId, int Quantity)> Lines,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;

public sealed record OrderShippedDomainEvent(
    int OrderId,
    string OrderNumber,
    string CustomerEmail,
    string Carrier,
    string TrackingNumber,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;