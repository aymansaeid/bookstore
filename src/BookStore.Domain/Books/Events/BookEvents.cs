using BookStore.Domain.Common;

namespace BookStore.Domain.Books.Events;

public sealed record BookBackInStockDomainEvent(
    int BookId,
    string Title,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;