using BookStore.Domain.Common;
using BookStore.Domain.Orders;

namespace BookStore.Domain.Returns;

public static class ReturnRefundCalculator
{
    public static (Money Amount, bool IsFullReturn) Calculate(Order order, IReadOnlyCollection<ReturnItem> items)
    {
        var purchased = order.Lines.ToDictionary(l => l.BookId);

        foreach (var item in items)
        {
            if (!purchased.TryGetValue(item.BookId, out var line))
                throw new ArgumentException($"Book {item.BookId} is not part of order {order.OrderNumber}.");
            if (item.Quantity <= 0 || item.Quantity > line.Quantity)
                throw new ArgumentException(
                    $"Can return between 1 and {line.Quantity} of '{line.BookTitleSnapshot}'.");
        }

        var totalUnits = order.Lines.Sum(l => l.Quantity);
        var returnedUnits = items.Sum(i => i.Quantity);

        // Every unit coming back: refund exactly what was paid, shipping
        // included. Returning the stored Total (rather than recomputing it)
        // guarantees zero rounding drift.
        if (returnedUnits == totalUnits)
            return (order.Total, true);

        // Partial: the returned books' share of what was actually paid for
        // merchandise, after the coupon. Shipping stays with the kept books.
        var returnedGross = items.Sum(i => purchased[i.BookId].UnitPriceAtPurchase.Amount * i.Quantity);
        var merchandisePaid = order.Subtotal.Amount - order.DiscountAmount.Amount;
        var share = returnedGross / order.Subtotal.Amount;

        var amount = Math.Round(merchandisePaid * share, 2, MidpointRounding.AwayFromZero);
        return (Money.From(amount, order.Total.Currency), false);
    }
}