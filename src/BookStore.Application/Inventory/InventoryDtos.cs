using BookStore.Application.Common;
using BookStore.Domain.Inventory;

namespace BookStore.Application.Inventory;

public sealed record StockMovementDto(
    int Id, int QuantityDelta, string Reason, string? Note,
    int? OrderId, int? AdminUserId, DateTimeOffset OccurredAtUtc);

public sealed record StockHistoryDto(
    int BookId, string Title, int CurrentStock, int LedgerTotal, bool IsBalanced,
    PagedResult<StockMovementDto> Movements);

public sealed record ReconciliationRowDto(
    int BookId, string Title, int StockQuantity, int LedgerTotal, int Drift, bool IsBalanced);

public sealed record LowStockAlertItem(string Title, int AvailableToSell, int Threshold, int WaitingListCount);

public static class InventoryMappings
{
    public static StockMovementDto ToDto(this StockMovement m) =>
        new(m.Id, m.QuantityDelta, m.Reason.ToString(), m.Note, m.OrderId, m.AdminUserId, m.OccurredAtUtc);
}