using BookStore.Domain.Common;

namespace BookStore.Domain.Books.Events;

public sealed record BookBackInStockDomainEvent(
    int BookId,
    string Title,
    DateTimeOffset OccurredOnUtc) : IDomainEvent;

public sealed record BookPriceDroppedDomainEvent(
    int BookId, decimal OldPrice, decimal NewPrice, string Currency, DateTimeOffset OccurredOnUtc) : IDomainEvent;

/// A muhaqqiq was newly linked to a visible book, or a book with
/// muhaqqiqs became visible.
public sealed record MuhaqqiqWorkAddedDomainEvent(
    int BookId, IReadOnlyCollection<int> MuhaqqiqIds, DateTimeOffset OccurredOnUtc) : IDomainEvent;