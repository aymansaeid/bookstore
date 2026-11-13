using BookStore.Application.Catalog;
using BookStore.Application.Common;
using BookStore.Application.Loyalty;
using BookStore.Domain.Books;
using BookStore.Domain.Loyalty;
using BookStore.Domain.Orders;

namespace BookStore.Application.Customers.Admin;

public sealed record AdminCustomerSummaryDto(
    int Id,
    string Email,
    string FullName,
    string? Phone,
    bool IsEmailVerified,
    bool IsActive,
    bool IsAnonymized,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? LastLoginAtUtc,
    int OrderCount,
    decimal TotalSpent,
    string Currency,
    DateTimeOffset? LastOrderAtUtc,
    int LoyaltyPoints,
    LoyaltyTier LoyaltyTier);

public sealed record AdminCustomerOverviewDto(
    int Total, int Active, int Inactive, int Unverified, int NewLast30Days, int WithOrders, int Anonymized);

public sealed record AdminCustomerAddressDto(
    int Id, string Label, string RecipientName, string Phone, string Line1, string? Line2,
    string City, string? StateOrProvince, string PostalCode, string CountryCode, bool IsDefault);

public sealed record AdminCustomerStatsDto(
    int OrderCount,
    int CancelledOrderCount,
    decimal TotalSpent,
    decimal RefundedTotal,
    decimal NetSpent,
    decimal AverageOrderValue,
    string Currency,
    DateTimeOffset? FirstOrderAtUtc,
    DateTimeOffset? LastOrderAtUtc);

public sealed record AdminCustomerActivityDto(
    int BooksOwned, int WishlistCount, int ApprovedReviews, int PendingReviews, int OpenReturns, int ActiveSessions);

public sealed record AdminCustomerOrderDto(
    int Id, string OrderNumber, OrderStatus Status, decimal Total, string Currency, int ItemCount,
    DateTimeOffset CreatedAtUtc, DateTimeOffset? PaidAtUtc);

public sealed record AdminCustomerDto(
    int Id,
    string Email,
    string FirstName,
    string LastName,
    string FullName,
    string? Phone,
    bool IsEmailVerified,
    DateTimeOffset? EmailVerifiedAtUtc,
    bool IsActive,
    bool IsAnonymized,
    bool AcceptsMarketingEmails,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? LastLoginAtUtc,
    ReaderLevel? ReadingLevel,
    decimal? MonthlyBudget,
    IReadOnlyList<CategoryRefDto> Interests,
    IReadOnlyList<AdminCustomerAddressDto> Addresses,
    AdminCustomerStatsDto Stats,
    AdminCustomerActivityDto Activity,
    LoyaltySummaryDto Loyalty,
    IReadOnlyList<AdminCustomerOrderDto> RecentOrders,
    IReadOnlyList<string> AllowedActions);

public static class AdminCustomerActions
{
    public const string Deactivate = "Deactivate";
    public const string Activate = "Activate";
    public const string SignOutEverywhere = "SignOutEverywhere";
    public const string ResendVerification = "ResendVerification";
    public const string AdjustPoints = "AdjustPoints";
}

public static class AdminCustomerErrors
{
    public static Error NotFound(int id) =>
        Error.NotFound("Customer.NotFound", $"Customer {id} was not found.");

    public static Error Anonymized =>
        Error.Conflict("Customer.Anonymized",
            "This account was deleted by its owner and can't be changed.");

    public static Error AlreadyVerified =>
        Error.Conflict("Customer.AlreadyVerified", "This customer has already verified their email.");

    public static Error InsufficientPoints(int balance) =>
        Error.Conflict("Loyalty.InsufficientBalance",
            $"The customer has only {balance} point(s); an adjustment can't make the balance negative.");
}

/// Pure calculation, so the spending rules are unit-tested without a database.
public static class AdminCustomerStatsCalculator
{
    /// Orders the customer actually paid for and didn't cancel.
    public static readonly IReadOnlySet<OrderStatus> CountedStatuses =
        new HashSet<OrderStatus> { OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Delivered };

    public static AdminCustomerStatsDto Compute(IReadOnlyList<Order> orders, decimal refundedByReturns, string currency)
    {
        var counted = orders.Where(o => CountedStatuses.Contains(o.Status)).ToList();
        var totalSpent = counted.Sum(o => o.Total.Amount);
        var refunded = Math.Min(refundedByReturns, totalSpent);

        return new AdminCustomerStatsDto(
            counted.Count,
            orders.Count(o => o.Status == OrderStatus.Cancelled),
            totalSpent,
            refunded,
            totalSpent - refunded,
            counted.Count == 0 ? 0m : Math.Round(totalSpent / counted.Count, 2, MidpointRounding.AwayFromZero),
            currency,
            counted.Min(o => o.PaidAtUtc),
            counted.Max(o => o.PaidAtUtc));
    }
}