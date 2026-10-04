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
               + request.GiftWrapAmount
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

    public Task<ExpireSessionResult> ExpireSessionAsync(string sessionId, CancellationToken ct = default)
    {
        var session = state.GetSession(sessionId);

        ExpireSessionResult result;

        if (session is null)
        {
            // Mock state is in-memory, so after an app restart every old session
            // is "unknown". A real gateway never forgets, but treating unknown as
            // closed is the safe choice here: nobody can pay a session that
            // doesn't exist.
            result = new ExpireSessionResult(ExpireSessionOutcome.NotFound);
        }
        else if (session.TryExpire())
        {
            result = new ExpireSessionResult(ExpireSessionOutcome.Expired);
        }
        else
        {
            result = new ExpireSessionResult(
                ExpireSessionOutcome.AlreadyCompleted,
                new CompletedPayment(session.PaymentReference, session.Total, session.Currency));
        }

        logger.LogInformation("MOCK expire session {SessionId}: {Outcome}", sessionId, result.Outcome);
        return Task.FromResult(result);
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