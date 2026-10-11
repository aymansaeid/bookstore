using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Loyalty;
using BookStore.Domain.Orders;
using BookStore.Domain.Returns;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Loyalty;

/// Every award and clawback goes through here. Each is idempotent, because
/// the outbox delivers events at least once.
public sealed class LoyaltyService(
    ILoyaltyRepository repository, IUnitOfWork unitOfWork, IOptions<LoyaltyOptions> options)
{
    public async Task AwardForOrderAsync(Order order, CancellationToken ct)
    {
        var o = options.Value;
        if (!o.Enabled || order.CustomerId is not { } customerId || order.Status != OrderStatus.Delivered)
            return;

        if (await repository.ExistsAsync(customerId, LoyaltyTransactionType.Earned, $"order:{order.OrderNumber}", ct))
            return;

        var points = LoyaltyCalculator.PointsFor(MerchandisePaid(order), o.CurrencyPerPoint);
        if (points == 0)
            return;

        repository.Add(LoyaltyTransaction.Earned(customerId, points, order.OrderNumber));
        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task ClawbackForReturnAsync(ReturnRequest request, Order order, CancellationToken ct)
    {
        if (order.CustomerId is not { } customerId || request.Status != ReturnStatus.Completed)
            return;

        if (await repository.ExistsAsync(customerId, LoyaltyTransactionType.ReturnClawback, $"return:{request.Id}", ct))
            return;

        var earned = await repository.SumForOrderAsync(customerId, order.OrderNumber, LoyaltyTransactionType.Earned, ct);
        if (earned == 0)
            return; // never earned (e.g. guest order, or loyalty was off)

        // Clawback rows are negative; flip the sign for "how much was taken".
        var taken = -await repository.SumForOrderAsync(customerId, order.OrderNumber, LoyaltyTransactionType.ReturnClawback, ct);

        var points = LoyaltyCalculator.ClawbackFor(
            earned, taken, request.IsFullReturn, request.RefundAmount.Amount, MerchandisePaid(order));

        if (points == 0)
            return;

        repository.Add(LoyaltyTransaction.Clawback(customerId, points, order.OrderNumber, request.Id));
        await unitOfWork.SaveChangesAsync(ct);
    }

    private static decimal MerchandisePaid(Order order) => order.Subtotal.Amount - order.DiscountAmount.Amount;
}