using BookStore.Application.Abstractions.Payments;
using BookStore.Application.Common;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookStore.Infrastructure.Payments;

public sealed class MockPaymentGateway(
    MockPaymentState state,
    IOptions<StoreOptions> storeOptions,
    ILogger<MockPaymentGateway> logger) : IPaymentGateway
{
    public Task<CheckoutSessionResult> CreateCheckoutSessionAsync(
        CreateCheckoutSessionRequest request, CancellationToken ct = default)
    {
        // Enforce the contract a real gateway will rely on: the total must
        // equal lines + shipping - discount. Catches the "discount never
        // reached the payment page" class of bug before real money does.
        var computed = request.LineItems.Sum(l => l.UnitPrice * l.Quantity)
                       + request.ShippingAmount
                       - request.DiscountAmount;

        if (computed != request.TotalAmount)
            throw new InvalidOperationException(
                $"Checkout total mismatch: lines+shipping-discount = {computed}, TotalAmount = {request.TotalAmount}.");

        var session = state.GetOrCreateSession(request.IdempotencyKey, () =>
            new MockSession(
                $"mock_cs_{Guid.NewGuid():N}",
                request.OrderNumber,
                request.TotalAmount,
                request.Currency,
                request.ExpiresAtUtc));

        var checkoutUrl =
            $"{storeOptions.Value.StorefrontBaseUrl}/dev/mock-checkout" +
            $"?session={Uri.EscapeDataString(session.SessionId)}&order={Uri.EscapeDataString(session.OrderNumber)}";

        logger.LogInformation(
            "MOCK checkout session {SessionId} for {OrderNumber}: {Total} {Currency}, expires {ExpiresAt}",
            session.SessionId, session.OrderNumber, session.Total, session.Currency, session.ExpiresAtUtc);

        return Task.FromResult(new CheckoutSessionResult(session.SessionId, checkoutUrl, session.ExpiresAtUtc));
    }

    public Task<ExpireSessionOutcome> ExpireSessionAsync(string sessionId, CancellationToken ct = default)
    {
        var session = state.GetSession(sessionId);

        var outcome = session is null
            ? ExpireSessionOutcome.NotFound
            : session.TryExpire()
                ? ExpireSessionOutcome.Expired
                : ExpireSessionOutcome.AlreadyCompleted;

        logger.LogInformation("MOCK expire session {SessionId}: {Outcome}", sessionId, outcome);
        return Task.FromResult(outcome);
    }

    public Task<RefundResult> RefundAsync(RefundRequest request, CancellationToken ct = default)
    {
        var refundReference = state.GetOrCreateRefund(request.IdempotencyKey);

        logger.LogWarning(
            "MOCK REFUND {RefundReference}: {Amount} {Currency} on {PaymentReference}. Reason: {Reason}",
            refundReference, request.Amount, request.Currency, request.PaymentReference, request.Reason);

        return Task.FromResult(new RefundResult(refundReference));
    }
}