namespace BookStore.Application.Payments;

public enum PaymentProvider
{
    Mock = 0,
    Stripe = 1
}

public sealed class PaymentOptions
{
    public const string SectionName = "Payments";

    public PaymentProvider Provider { get; init; } = PaymentProvider.Mock;

    /// How long a checkout holds its reserved stock before the sweep (6b)
    /// releases it. 30 minutes is also Stripe's minimum session lifetime,
    /// so this value transfers unchanged when you switch gateways.
    public int CheckoutSessionMinutes { get; init; } = 30;

    public string SuccessPath { get; init; } = "/checkout/success";
    public string CancelPath { get; init; } = "/checkout/cancel";

    /// Bump this whenever the distance sales contract or pre-information
    /// text changes. Checkout rejects any other version, which forces the
    /// frontend to fetch and show the new text before the customer can pay.
    public string CurrentTermsVersion { get; init; } = "2026-09";
}