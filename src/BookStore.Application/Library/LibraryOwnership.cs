using BookStore.Domain.Library;
using BookStore.Domain.Orders;
using BookStore.Domain.Returns;

namespace BookStore.Application.Library;

public enum LibraryOwnership
{
    /// Delivered, and not returned.
    Purchased = 0,

    /// Paid or shipped, not delivered yet.
    OnTheWay = 1,

    /// "I already own this", from elsewhere.
    AddedManually = 2
}

public sealed record OwnedBook(LibraryOwnership Ownership, DateTimeOffset? AcquiredAtUtc);

public static class LibraryOwnershipCalculator
{
    public static IReadOnlyDictionary<int, OwnedBook> Compute(
        IReadOnlyList<Order> customerOrders,
        IReadOnlyList<ReturnRequest> completedReturns,
        IReadOnlyList<LibraryEntry> entries)
    {
        var returnedByBook = completedReturns
            .SelectMany(r => r.Lines)
            .GroupBy(l => l.BookId)
            .ToDictionary(g => g.Key, g => g.Sum(l => l.Quantity));

        var result = new Dictionary<int, OwnedBook>();

        // Cancelled, expired, unpaid and fully refunded orders never count.
        var lines = customerOrders
            .Where(o => o.Status is OrderStatus.Paid or OrderStatus.Shipped or OrderStatus.Delivered)
            .SelectMany(o => o.Lines.Select(l => (Order: o, Line: l)))
            .GroupBy(x => x.Line.BookId);

        foreach (var group in lines)
        {
            var delivered = group.Where(x => x.Order.Status == OrderStatus.Delivered).Sum(x => x.Line.Quantity);
            var inTransit = group.Where(x => x.Order.Status != OrderStatus.Delivered).Sum(x => x.Line.Quantity);
            var keptDelivered = delivered - returnedByBook.GetValueOrDefault(group.Key);
            var acquiredAt = group.Min(x => x.Order.PaidAtUtc);

            if (keptDelivered > 0)
                result[group.Key] = new OwnedBook(LibraryOwnership.Purchased, acquiredAt);
            else if (inTransit > 0)
                result[group.Key] = new OwnedBook(LibraryOwnership.OnTheWay, acquiredAt);
        }

        // A purchase outranks a manual flag: it's the stronger fact.
        foreach (var entry in entries.Where(e => e.IsManuallyOwned && !result.ContainsKey(e.BookId)))
            result[entry.BookId] = new OwnedBook(LibraryOwnership.AddedManually, entry.UpdatedAtUtc);

        return result;
    }
}

/// Loads what the calculator needs. Shared by the library query and the
/// progress command, so "is this book on your shelf?" has one answer.
public sealed class LibraryReader(
    Abstractions.Repositories.IOrderRepository orderRepository,
    Abstractions.Repositories.IReturnRequestRepository returnRepository,
    Abstractions.Repositories.ILibraryEntryRepository libraryRepository)
{
    public async Task<(IReadOnlyDictionary<int, OwnedBook> Owned, IReadOnlyList<LibraryEntry> Entries)> LoadAsync(
        int customerId, CancellationToken ct)
    {
        var orders = await orderRepository.ListByCustomerIdAsync(customerId, ct);
        var returns = await returnRepository.ListCompletedForOrdersAsync(orders.Select(o => o.Id).ToList(), ct);
        var entries = await libraryRepository.ListByCustomerAsync(customerId, ct);

        return (LibraryOwnershipCalculator.Compute(orders, returns, entries), entries);
    }
}