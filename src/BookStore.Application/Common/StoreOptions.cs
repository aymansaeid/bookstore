namespace BookStore.Application.Common;

public sealed class StoreOptions
{
    public const string SectionName = "Store";

    public string Currency { get; init; } = "USD";
    public string Name { get; init; } = "BookStore";
    public string SupportEmail { get; init; } = "support@example.com";

    /// Public URL of the React storefront, used to build links in emails.
    /// No trailing slash.
    public string StorefrontBaseUrl { get; init; } = "http://localhost:3000";
}