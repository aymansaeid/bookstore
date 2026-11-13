using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Common;
using BookStore.Domain.Loyalty;
using BookStore.Domain.Orders;
using BookStore.Domain.Returns;
using BookStore.Domain.Reviews;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Queries;

public sealed class AdminCustomerQueries(BookStoreDbContext dbContext) : IAdminCustomerQueries
{
    public async Task<PagedResult<AdminCustomerRow>> ListAsync(AdminCustomerListFilter filter, CancellationToken ct = default)
    {
        // Local copy: EF parameterises it as an IN list.
        OrderStatus[] counted = [OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Delivered];

        var query = dbContext.Customers.AsNoTracking();

        query = filter.Status switch
        {
            AdminCustomerStatus.Active => query.Where(c => c.IsActive && !c.IsAnonymized),
            AdminCustomerStatus.Inactive => query.Where(c => !c.IsActive && !c.IsAnonymized),
            AdminCustomerStatus.Unverified => query.Where(c => !c.IsEmailVerified && !c.IsAnonymized),
            AdminCustomerStatus.Anonymized => query.Where(c => c.IsAnonymized),
            _ => query.Where(c => !c.IsAnonymized)
        };

        if (!string.IsNullOrWhiteSpace(filter.Search))
            query = ApplySearch(query, filter.Search.Trim());

        var total = await query.CountAsync(ct);

        // Anonymous projection first: EF can sort on its members (it can't
        // sort on a record's constructor arguments).
        var projected = query.Select(c => new
        {
            c.Id,
            c.Email,
            c.FirstName,
            c.LastName,
            c.Phone,
            c.IsEmailVerified,
            c.IsActive,
            c.IsAnonymized,
            c.CreatedAtUtc,
            c.LastLoginAtUtc,
            OrderCount = dbContext.Orders.Count(o => o.CustomerId == c.Id && counted.Contains(o.Status)),
            TotalSpent = dbContext.Orders
                .Where(o => o.CustomerId == c.Id && counted.Contains(o.Status))
                .Sum(o => (decimal?)o.Total.Amount) ?? 0m,
            LastOrderAtUtc = dbContext.Orders
                .Where(o => o.CustomerId == c.Id && counted.Contains(o.Status))
                .Max(o => o.PaidAtUtc)
        });

        var ordered = filter.Sort switch
        {
            AdminCustomerSort.Oldest => projected.OrderBy(x => x.CreatedAtUtc).ThenBy(x => x.Id),
            AdminCustomerSort.TopSpenders => projected.OrderByDescending(x => x.TotalSpent).ThenByDescending(x => x.Id),
            AdminCustomerSort.MostOrders => projected.OrderByDescending(x => x.OrderCount).ThenByDescending(x => x.Id),
            // SQL Server sorts NULL lowest, so never-logged-in customers land last.
            AdminCustomerSort.RecentlyActive => projected.OrderByDescending(x => x.LastLoginAtUtc).ThenByDescending(x => x.Id),
            _ => projected.OrderByDescending(x => x.CreatedAtUtc).ThenByDescending(x => x.Id)
        };

        var rows = await ordered
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(ct);

        return new PagedResult<AdminCustomerRow>(
            rows.Select(x => new AdminCustomerRow(
                x.Id, x.Email, x.FirstName, x.LastName, x.Phone,
                x.IsEmailVerified, x.IsActive, x.IsAnonymized, x.CreatedAtUtc, x.LastLoginAtUtc,
                x.OrderCount, x.TotalSpent, x.LastOrderAtUtc)).ToList(),
            filter.Page, filter.PageSize, total);
    }

    /// Whatever the admin has in hand: an order number, a customer id, a
    /// phone (spaces ignored), an email or a name.
    private IQueryable<Domain.Customers.Customer> ApplySearch(IQueryable<Domain.Customers.Customer> query, string term)
    {
        if (term.StartsWith("BK-", StringComparison.OrdinalIgnoreCase))
        {
            var orderNumber = term.ToUpperInvariant();
            return query.Where(c => dbContext.Orders.Any(o => o.CustomerId == c.Id && o.OrderNumber == orderNumber));
        }

        if (term.StartsWith('#') && int.TryParse(term[1..], out var exactId))
            return query.Where(c => c.Id == exactId);

        var digits = new string(term.Where(char.IsDigit).ToArray());
        var looksLikePhone = digits.Length >= 4 && term.All(ch => char.IsDigit(ch) || ch is '+' or ' ' or '-' or '(' or ')');

        if (looksLikePhone)
        {
            _ = int.TryParse(digits, out var maybeId);
            return query.Where(c => c.Id == maybeId
                                    || (c.Phone != null && c.Phone.Replace(" ", "").Replace("-", "").Contains(digits)));
        }

        var lowered = term.ToLowerInvariant();
        return query.Where(c =>
            c.Email.Contains(lowered)
            || c.FirstName.Contains(term)
            || c.LastName.Contains(term)
            || (c.FirstName + " " + c.LastName).Contains(term));
    }

    public async Task<IReadOnlyDictionary<int, LoyaltyTotals>> GetLoyaltyTotalsAsync(
        IReadOnlyCollection<int> customerIds, DateTimeOffset earnedSinceUtc, CancellationToken ct = default)
    {
        if (customerIds.Count == 0)
            return new Dictionary<int, LoyaltyTotals>();

        return await dbContext.LoyaltyTransactions
            .AsNoTracking()
            .Where(t => customerIds.Contains(t.CustomerId))
            .GroupBy(t => t.CustomerId)
            .Select(g => new
            {
                CustomerId = g.Key,
                Balance = g.Sum(t => t.Points),
                // Tier basis: earned minus clawbacks in the window, as LoyaltyRepository does.
                Earned = g.Sum(t => t.CreatedAtUtc >= earnedSinceUtc
                                    && (t.Type == LoyaltyTransactionType.Earned || t.Type == LoyaltyTransactionType.ReturnClawback)
                    ? t.Points
                    : 0)
            })
            .ToDictionaryAsync(x => x.CustomerId, x => new LoyaltyTotals(x.Balance, x.Earned), ct);
    }

    public async Task<AdminCustomerOverview> GetOverviewAsync(DateTimeOffset newSinceUtc, CancellationToken ct = default)
    {
        OrderStatus[] counted = [OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Delivered];
        var customers = dbContext.Customers.AsNoTracking();
        var live = customers.Where(c => !c.IsAnonymized);

        return new AdminCustomerOverview(
            Total: await live.CountAsync(ct),
            Active: await live.CountAsync(c => c.IsActive, ct),
            Inactive: await live.CountAsync(c => !c.IsActive, ct),
            Unverified: await live.CountAsync(c => !c.IsEmailVerified, ct),
            NewLast30Days: await live.CountAsync(c => c.CreatedAtUtc >= newSinceUtc, ct),
            WithOrders: await live.CountAsync(c => dbContext.Orders.Any(o => o.CustomerId == c.Id && counted.Contains(o.Status)), ct),
            Anonymized: await customers.CountAsync(c => c.IsAnonymized, ct));
    }

    public async Task<AdminCustomerActivity> GetActivityAsync(int customerId, DateTimeOffset nowUtc, CancellationToken ct = default)
    {
        var reviews = await dbContext.Reviews
            .AsNoTracking()
            .Where(r => r.CustomerId == customerId)
            .GroupBy(r => r.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count, ct);

        var openReturns = await dbContext.ReturnRequests
            .AsNoTracking()
            .CountAsync(r => (r.Status == ReturnStatus.Requested || r.Status == ReturnStatus.Approved)
                             && dbContext.Orders.Any(o => o.Id == r.OrderId && o.CustomerId == customerId), ct);

        // A live session = a refresh token not yet used, revoked or expired.
        var sessions = await dbContext.RefreshTokens
            .AsNoTracking()
            .CountAsync(t => t.CustomerId == customerId
                             && t.UsedAtUtc == null && t.RevokedAtUtc == null && t.ExpiresAtUtc > nowUtc, ct);

        return new AdminCustomerActivity(
            await dbContext.WishlistItems.CountAsync(w => w.CustomerId == customerId, ct),
            reviews.GetValueOrDefault(ReviewStatus.Approved),
            reviews.GetValueOrDefault(ReviewStatus.Pending),
            openReturns,
            sessions);
    }
}