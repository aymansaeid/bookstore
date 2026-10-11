using BookStore.Application.Common;
using BookStore.Domain.Loyalty;

namespace BookStore.Application.Abstractions.Repositories;

public interface ILoyaltyRepository
{
    Task<int> GetBalanceAsync(int customerId, CancellationToken ct = default);

    /// Earned minus clawbacks since a date: the tier basis. Redemptions don't count.
    Task<int> GetNetEarnedSinceAsync(int customerId, DateTimeOffset sinceUtc, CancellationToken ct = default);

    Task<bool> ExistsAsync(int customerId, LoyaltyTransactionType type, string referenceKey, CancellationToken ct = default);
    Task<int> SumForOrderAsync(int customerId, string orderNumber, LoyaltyTransactionType type, CancellationToken ct = default);
    Task<PagedResult<LoyaltyTransaction>> ListAsync(int customerId, int page, int pageSize, CancellationToken ct = default);
    void Add(LoyaltyTransaction transaction);
    Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default);
}