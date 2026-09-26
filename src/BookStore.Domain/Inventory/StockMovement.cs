using BookStore.Domain.Common;

namespace BookStore.Domain.Inventory;

public enum StockMovementReason
{
    OpeningBalance = 0,
    InitialStock = 1,
    ManualAdjustment = 2,
    Sale = 3,
    CancellationRestock = 4,
    ReturnRestock = 5
}

/// One row per change to a book's PHYSICAL stock. The sum of all deltas for
/// a book must equal its StockQuantity; the reconciliation report checks it.
public sealed class StockMovement : AggregateRoot<int>
{
    public int BookId { get; private set; }
    public int QuantityDelta { get; private set; }
    public StockMovementReason Reason { get; private set; }
    public string? Note { get; private set; }
    public int? OrderId { get; private set; }
    public int? AdminUserId { get; private set; }
    public DateTimeOffset OccurredAtUtc { get; private set; }

    private StockMovement() { } // EF Core

    public static StockMovement Create(
        int bookId,
        int quantityDelta,
        StockMovementReason reason,
        string? note = null,
        int? orderId = null,
        int? adminUserId = null)
    {
        if (bookId <= 0)
            throw new ArgumentOutOfRangeException(nameof(bookId));
        if (quantityDelta == 0)
            throw new ArgumentException("A stock movement must actually change stock.", nameof(quantityDelta));
        if (reason == StockMovementReason.ManualAdjustment && string.IsNullOrWhiteSpace(note))
            throw new ArgumentException("Manual adjustments require a note explaining why.", nameof(note));

        return new StockMovement
        {
            BookId = bookId,
            QuantityDelta = quantityDelta,
            Reason = reason,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            OrderId = orderId,
            AdminUserId = adminUserId,
            OccurredAtUtc = DateTimeOffset.UtcNow
        };
    }
}