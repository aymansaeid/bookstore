using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Library;
using BookStore.Domain.Loyalty;
using BookStore.Domain.Orders;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Loyalty;

public sealed record NextTierDto(LoyaltyTier Tier, int PointsNeeded);

public sealed record LoyaltySummaryDto(
    bool Enabled,
    int Balance,
    int PendingPoints,
    LoyaltyTier Tier,
    int EarnedLast12Months,
    NextTierDto? NextTier,
    decimal CurrencyPerPoint);

public sealed record LoyaltyTransactionDto(
    int Id, LoyaltyTransactionType Type, int Points, string? OrderNumber, string? Note, DateTimeOffset CreatedAtUtc);

/// «لوحتي»: the four cards plus the header badge, in one call.
public sealed record AccountSummaryDto(
    int OrderCount,
    int BooksOwned,
    int WishlistCount,
    int LoyaltyPoints,
    LoyaltyTier LoyaltyTier,
    int UnreadNotifications);

public sealed class LoyaltyReader(
    ILoyaltyRepository repository, IOrderRepository orderRepository, IOptions<LoyaltyOptions> options)
{
    public async Task<LoyaltySummaryDto> SummaryAsync(int customerId, CancellationToken ct)
    {
        var o = options.Value;
        var balance = await repository.GetBalanceAsync(customerId, ct);
        var earned = await repository.GetNetEarnedSinceAsync(customerId, DateTimeOffset.UtcNow.AddMonths(-12), ct);

        // Paid or shipped, not delivered yet: what they WILL earn on arrival.
        var orders = await orderRepository.ListByCustomerIdAsync(customerId, ct);
        var pending = orders
            .Where(order => order.Status is OrderStatus.Paid or OrderStatus.Shipped)
            .Sum(order => LoyaltyCalculator.PointsFor(order.Subtotal.Amount - order.DiscountAmount.Amount, o.CurrencyPerPoint));

        var next = o.NextTier(earned);

        return new LoyaltySummaryDto(
            o.Enabled, balance, o.Enabled ? pending : 0, o.TierFor(earned), earned,
            next is { } n ? new NextTierDto(n.Tier, n.PointsNeeded) : null,
            o.CurrencyPerPoint);
    }
}

public sealed record GetLoyaltySummaryQuery(int CustomerId) : IQuery<LoyaltySummaryDto>;

public sealed class GetLoyaltySummaryQueryHandler(LoyaltyReader reader)
    : IQueryHandler<GetLoyaltySummaryQuery, LoyaltySummaryDto>
{
    public async Task<Result<LoyaltySummaryDto>> Handle(GetLoyaltySummaryQuery query, CancellationToken ct) =>
        Result.Success(await reader.SummaryAsync(query.CustomerId, ct));
}

public sealed record GetLoyaltyHistoryQuery(int CustomerId, int Page = 1, int PageSize = 20)
    : IQuery<PagedResult<LoyaltyTransactionDto>>;

public sealed class GetLoyaltyHistoryQueryValidator : AbstractValidator<GetLoyaltyHistoryQuery>
{
    public GetLoyaltyHistoryQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 50);
    }
}

public sealed class GetLoyaltyHistoryQueryHandler(ILoyaltyRepository repository)
    : IQueryHandler<GetLoyaltyHistoryQuery, PagedResult<LoyaltyTransactionDto>>
{
    public async Task<Result<PagedResult<LoyaltyTransactionDto>>> Handle(GetLoyaltyHistoryQuery query, CancellationToken ct)
    {
        var page = await repository.ListAsync(query.CustomerId, query.Page, query.PageSize, ct);

        return Result.Success(new PagedResult<LoyaltyTransactionDto>(
            page.Items.Select(t => new LoyaltyTransactionDto(t.Id, t.Type, t.Points, t.OrderNumber, t.Note, t.CreatedAtUtc)).ToList(),
            page.Page, page.PageSize, page.TotalCount));
    }
}

public sealed record GetAccountSummaryQuery(int CustomerId) : IQuery<AccountSummaryDto>;

public sealed class GetAccountSummaryQueryHandler(
    IOrderRepository orderRepository,
    LibraryReader libraryReader,
    IWishlistRepository wishlistRepository,
    INotificationRepository notificationRepository,
    LoyaltyReader loyaltyReader)
    : IQueryHandler<GetAccountSummaryQuery, AccountSummaryDto>
{
    public async Task<Result<AccountSummaryDto>> Handle(GetAccountSummaryQuery query, CancellationToken ct)
    {
        var orders = await orderRepository.ListByCustomerIdAsync(query.CustomerId, ct);
        var (owned, _) = await libraryReader.LoadAsync(query.CustomerId, ct);
        var loyalty = await loyaltyReader.SummaryAsync(query.CustomerId, ct);

        return Result.Success(new AccountSummaryDto(
            // Abandoned checkouts aren't "orders" to the customer.
            orders.Count(o => o.Status is not (OrderStatus.PendingPayment or OrderStatus.Expired)),
            owned.Count,
            await wishlistRepository.CountByCustomerAsync(query.CustomerId, ct),
            loyalty.Balance,
            loyalty.Tier,
            await notificationRepository.CountUnreadAsync(query.CustomerId, ct)));
    }
}