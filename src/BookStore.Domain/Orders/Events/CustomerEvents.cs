using BookStore.Domain.Common;

namespace BookStore.Domain.Customers.Events;

public sealed record CustomerRegisteredDomainEvent(
    string Email,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;

public sealed record CustomerEmailVerifiedDomainEvent(
    int CustomerId,
    string Email,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;