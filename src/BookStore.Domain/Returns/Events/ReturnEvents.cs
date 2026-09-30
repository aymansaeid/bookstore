using BookStore.Domain.Common;

namespace BookStore.Domain.Returns.Events;

public sealed record ReturnRequestedDomainEvent(
    string OrderNumber, string CustomerEmail, int ItemCount, ReturnReason Reason, bool IsFullReturn,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;

public sealed record ReturnApprovedDomainEvent(int ReturnRequestId, DateTimeOffset OccurredOnUtc) : IDomainEvent;

public sealed record ReturnRejectedDomainEvent(int ReturnRequestId, DateTimeOffset OccurredOnUtc) : IDomainEvent;

public sealed record ReturnCompletedDomainEvent(int ReturnRequestId, DateTimeOffset OccurredOnUtc) : IDomainEvent;