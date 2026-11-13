using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Catalog;
using BookStore.Application.Common;
using BookStore.Application.Library;
using BookStore.Application.Loyalty;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Customers.Admin;

public sealed record GetAdminCustomersQuery(
    string? Search, AdminCustomerStatus? Status, AdminCustomerSort Sort = AdminCustomerSort.Newest,
    int Page = 1, int PageSize = 20) : IQuery<PagedResult<AdminCustomerSummaryDto>>;

public sealed class GetAdminCustomersQueryValidator : AbstractValidator<GetAdminCustomersQuery>
{
    public GetAdminCustomersQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(100);
        RuleFor(x => x.Status).IsInEnum().When(x => x.Status.HasValue);
        RuleFor(x => x.Sort).IsInEnum();
        RuleFor(x => x.Page).InclusiveBetween(1, 10_000);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
    }
}

public sealed class GetAdminCustomersQueryHandler(
    IAdminCustomerQueries queries,
    IOptions<LoyaltyOptions> loyaltyOptions,
    IOptions<StoreOptions> storeOptions)
    : IQueryHandler<GetAdminCustomersQuery, PagedResult<AdminCustomerSummaryDto>>
{
    public async Task<Result<PagedResult<AdminCustomerSummaryDto>>> Handle(GetAdminCustomersQuery query, CancellationToken ct)
    {
        var page = await queries.ListAsync(
            new AdminCustomerListFilter(query.Search, query.Status, query.Sort, query.Page, query.PageSize), ct);

        // One loyalty query for the whole page, not one per row.
        var loyalty = await queries.GetLoyaltyTotalsAsync(
            page.Items.Select(r => r.Id).ToList(), DateTimeOffset.UtcNow.AddMonths(-12), ct);

        var currency = storeOptions.Value.Currency;
        var items = page.Items.Select(r =>
        {
            var totals = loyalty.GetValueOrDefault(r.Id) ?? new LoyaltyTotals(0, 0);

            return new AdminCustomerSummaryDto(
                r.Id, r.Email, $"{r.FirstName} {r.LastName}".Trim(), r.Phone,
                r.IsEmailVerified, r.IsActive, r.IsAnonymized, r.CreatedAtUtc, r.LastLoginAtUtc,
                r.OrderCount, r.TotalSpent, currency, r.LastOrderAtUtc,
                totals.Balance, loyaltyOptions.Value.TierFor(totals.EarnedSince));
        }).ToList();

        return Result.Success(new PagedResult<AdminCustomerSummaryDto>(items, page.Page, page.PageSize, page.TotalCount));
    }
}

public sealed record GetAdminCustomerOverviewQuery : IQuery<AdminCustomerOverviewDto>;

public sealed class GetAdminCustomerOverviewQueryHandler(IAdminCustomerQueries queries)
    : IQueryHandler<GetAdminCustomerOverviewQuery, AdminCustomerOverviewDto>
{
    public async Task<Result<AdminCustomerOverviewDto>> Handle(GetAdminCustomerOverviewQuery query, CancellationToken ct)
    {
        var o = await queries.GetOverviewAsync(DateTimeOffset.UtcNow.AddDays(-30), ct);
        return Result.Success(new AdminCustomerOverviewDto(
            o.Total, o.Active, o.Inactive, o.Unverified, o.NewLast30Days, o.WithOrders, o.Anonymized));
    }
}

public sealed record GetAdminCustomerQuery(int CustomerId) : IQuery<AdminCustomerDto>;

public sealed class GetAdminCustomerQueryHandler(
    ICustomerRepository customerRepository,
    IOrderRepository orderRepository,
    IReturnRequestRepository returnRepository,
    ICategoryRepository categoryRepository,
    IAdminCustomerQueries queries,
    LibraryReader libraryReader,
    LoyaltyReader loyaltyReader,
    IOptions<StoreOptions> storeOptions)
    : IQueryHandler<GetAdminCustomerQuery, AdminCustomerDto>
{
    private const int RecentOrderCount = 10;

    public async Task<Result<AdminCustomerDto>> Handle(GetAdminCustomerQuery query, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(query.CustomerId, ct);
        if (customer is null)
            return Result.Failure<AdminCustomerDto>(AdminCustomerErrors.NotFound(query.CustomerId));

        var orders = await orderRepository.ListByCustomerIdAsync(customer.Id, ct);
        var completedReturns = await returnRepository.ListCompletedForOrdersAsync(orders.Select(o => o.Id).ToList(), ct);
        var stats = AdminCustomerStatsCalculator.Compute(
            orders, completedReturns.Sum(r => r.RefundAmount.Amount), storeOptions.Value.Currency);

        var activity = await queries.GetActivityAsync(customer.Id, DateTimeOffset.UtcNow, ct);
        var (owned, _) = await libraryReader.LoadAsync(customer.Id, ct);
        var loyalty = await loyaltyReader.SummaryAsync(customer.Id, ct);

        var categories = (await categoryRepository.ListAsync(includeInactive: true, ct)).ToDictionary(c => c.Id);
        var interests = customer.InterestCategoryIds
            .Where(categories.ContainsKey)
            .Select(id => categories[id].ToRef())
            .ToList();

        var recentOrders = orders
            .OrderByDescending(o => o.CreatedAtUtc)
            .Take(RecentOrderCount)
            .Select(o => new AdminCustomerOrderDto(
                o.Id, o.OrderNumber, o.Status, o.Total.Amount, o.Total.Currency,
                o.Lines.Sum(l => l.Quantity), o.CreatedAtUtc, o.PaidAtUtc))
            .ToList();

        var addresses = customer.Addresses
            .OrderByDescending(a => a.IsDefault)
            .ThenBy(a => a.Id)
            .Select(a => new AdminCustomerAddressDto(
                a.Id, a.Label, a.RecipientName, a.Phone, a.Line1, a.Line2,
                a.City, a.StateOrProvince, a.PostalCode, a.CountryCode, a.IsDefault))
            .ToList();

        return Result.Success(new AdminCustomerDto(
            customer.Id, customer.Email, customer.FirstName, customer.LastName, customer.FullName, customer.Phone,
            customer.IsEmailVerified, customer.EmailVerifiedAtUtc, customer.IsActive, customer.IsAnonymized,
            customer.AcceptsMarketingEmails, customer.CreatedAtUtc, customer.LastLoginAtUtc,
            customer.ReadingLevel, customer.MonthlyBudget, interests, addresses,
            stats,
            new AdminCustomerActivityDto(
                owned.Count, activity.WishlistCount, activity.ApprovedReviews, activity.PendingReviews,
                activity.OpenReturns, activity.ActiveSessions),
            loyalty,
            recentOrders,
            AllowedActions(customer.IsActive, customer.IsAnonymized, customer.IsEmailVerified, activity.ActiveSessions)));
    }

    /// The admin UI shows exactly these buttons; the server enforces the same rules.
    private static IReadOnlyList<string> AllowedActions(bool isActive, bool isAnonymized, bool isVerified, int sessions)
    {
        if (isAnonymized)
            return [];

        var actions = new List<string>
        {
            isActive ? AdminCustomerActions.Deactivate : AdminCustomerActions.Activate,
            AdminCustomerActions.AdjustPoints
        };

        if (sessions > 0)
            actions.Add(AdminCustomerActions.SignOutEverywhere);
        if (isActive && !isVerified)
            actions.Add(AdminCustomerActions.ResendVerification);

        return actions;
    }
}