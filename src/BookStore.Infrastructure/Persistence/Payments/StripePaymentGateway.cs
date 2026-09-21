using BookStore.Application.Abstractions.Payments;
using Stripe.Checkout;

namespace BookStore.Infrastructure.Payments;

public sealed class StripePaymentGateway : IPaymentGateway
{
    public async Task<CheckoutSessionResult> CreateCheckoutSessionAsync(
        CreateCheckoutSessionRequest request, CancellationToken ct = default)
    {
        var options = new SessionCreateOptions
        {
            Mode = "payment",
            CustomerEmail = request.CustomerEmail,
            ClientReferenceId = request.OrderNumber,
            SuccessUrl = request.SuccessUrl,
            CancelUrl = request.CancelUrl,
            LineItems = request.LineItems.Select(item => new SessionLineItemOptions
            {
                Quantity = item.Quantity,
                PriceData = new SessionLineItemPriceDataOptions
                {
                    Currency = item.Currency.ToLowerInvariant(),
                    UnitAmount = ToMinorUnits(item.UnitPrice),
                    ProductData = new SessionLineItemPriceDataProductDataOptions { Name = item.Description }
                }
            }).ToList()
        };

        if (request.ShippingAmount > 0)
        {
            options.LineItems.Add(new SessionLineItemOptions
            {
                Quantity = 1,
                PriceData = new SessionLineItemPriceDataOptions
                {
                    Currency = request.Currency.ToLowerInvariant(),
                    UnitAmount = ToMinorUnits(request.ShippingAmount),
                    ProductData = new SessionLineItemPriceDataProductDataOptions { Name = "Shipping" }
                }
            });
        }

        var session = await new SessionService().CreateAsync(options, cancellationToken: ct);
        return new CheckoutSessionResult(session.Id, session.Url);
    }

    // Stripe wants amounts in the currency's smallest unit (cents for USD).
    // This assumes a 2-decimal currency (USD/EUR/TRY) — a zero-decimal
    // currency like JPY would need different handling. Flagging it now so
    // it's not a silent landmine if you ever add one.
    private static long ToMinorUnits(decimal amount) => (long)Math.Round(amount * 100, MidpointRounding.AwayFromZero);
}