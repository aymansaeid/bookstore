using BookStore.Application.Common;

namespace BookStore.Application.Abstractions.Queries;

public enum AdminCustomerStatus
{
    /// Can sign in and shop.
    Active = 0,

    /// Deactivated by an admin.
    Inactive = 1,

    /// Registered but never verified their email.
    Unverified = 2,

    /// Deleted by the customer (KVKK). Excluded from every other filter.
    Anonymized = 3
}

public enum AdminCustomerSort
{
    Newest = 0,
    Oldest = 1,
    TopSpenders = 2,
    MostOrders = 3,
    RecentlyActive = 4
}

public sealed record AdminCustomerListFilter(
    string? Search, AdminCustomerStatus? Status, AdminCustomerSort Sort, int Page, int PageSize);

public sealed record AdminCustomerRow(
    int Id, string Email, string FirstName, string LastName, string? Phone,
    bool IsEmailVerified, bool IsActive, bool IsAnonymized,
    DateTimeOffset CreatedAtUtc, DateTimeOffset? LastLoginAtUtc,
    int OrderCount, decimal TotalSpent, DateTimeOffset? LastOrderAtUtc);

public sealed record LoyaltyTotals(int Balance, int EarnedSince);

public sealed record AdminCustomerOverview(
    int Total, int Active, int Inactive, int Unverified, int NewLast30Days, int WithOrders, int Anonymized);

public sealed record AdminCustomerActivity(
    int WishlistCount, int ApprovedReviews, int PendingReviews, int OpenReturns, int ActiveSessions);

public interface IAdminCustomerQueries
{
    Task<PagedResult<AdminCustomerRow>> ListAsync(AdminCustomerListFilter filter, CancellationToken ct = default);

    /// Balance and points earned since a date (the tier basis), for a page of customers in one query.
    Task<IReadOnlyDictionary<int, LoyaltyTotals>> GetLoyaltyTotalsAsync(
        IReadOnlyCollection<int> customerIds, DateTimeOffset earnedSinceUtc, CancellationToken ct = default);

    Task<AdminCustomerOverview> GetOverviewAsync(DateTimeOffset newSinceUtc, CancellationToken ct = default);

    Task<AdminCustomerActivity> GetActivityAsync(int customerId, DateTimeOffset nowUtc, CancellationToken ct = default);
}