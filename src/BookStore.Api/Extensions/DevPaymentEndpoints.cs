using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Payments.Commands;
using BookStore.Infrastructure.Payments;
using MediatR;

namespace BookStore.Api.Extensions;

public static class DevPaymentEndpoints
{
    public static void MapDevPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        var payments = app.MapGroup("/api/dev/payments").WithTags("Dev: Mock Payments");

        payments.MapGet("/{sessionId}", (string sessionId, MockPaymentState state) =>
            state.GetSession(sessionId) is { } s
                ? Results.Ok(new
                {
                    s.SessionId,
                    s.OrderNumber,
                    s.Total,
                    s.Currency,
                    s.ExpiresAtUtc,
                    Status = s.Status.ToString()
                })
                : Results.NotFound());

        // deliverWebhook=false: the customer pays, but the confirmation never
        // reaches us. The sweep should notice and reconcile it.
        payments.MapPost("/{sessionId}/simulate-paid", async (
            string sessionId,
            string? eventId,
            bool? deliverWebhook,
            MockPaymentState state,
            ISender sender,
            CancellationToken ct) =>
        {
            var session = state.GetSession(sessionId);
            if (session is null)
                return Results.NotFound(new { error = $"No mock session '{sessionId}'." });

            if (!session.TryComplete())
                return Results.Conflict(new
                {
                    error = "This session is expired or closed. A real gateway would refuse this payment too."
                });

            if (deliverWebhook == false)
                return Results.Ok(new
                {
                    Outcome = "PaidButWebhookLost",
                    session.PaymentReference,
                    Note = "Order stays PendingPayment until the sweep reconciles it."
                });

            var result = await sender.Send(new ConfirmOrderPaymentCommand(
                eventId ?? $"mock_evt_{Guid.NewGuid():N}",
                session.SessionId,
                session.PaymentReference,
                session.Total,
                session.Currency), ct);

            return result.IsSuccess
                ? Results.Ok(new { Outcome = result.Value.ToString(), session.PaymentReference })
                : Results.Problem(title: result.Error.Code, detail: result.Error.Message, statusCode: 400);
        });

        var checkouts = app.MapGroup("/api/dev/checkouts").WithTags("Dev: Checkout Sweep");

        // Runs one sweep now, respecting real expiry times. Only orders past
        // CheckoutExpiresAtUtc + grace period are touched.
        checkouts.MapPost("/sweep", async (CheckoutSweepRunner runner, CancellationToken ct) =>
            Results.Ok(await runner.RunOnceAsync(ct)));

        // Expires one order immediately, ignoring its expiry time.
        checkouts.MapPost("/{orderNumber}/expire", async (
            string orderNumber,
            IOrderRepository orderRepository,
            ISender sender,
            CancellationToken ct) =>
        {
            var order = await orderRepository.GetByOrderNumberAsync(orderNumber.Trim().ToUpperInvariant(), ct);
            if (order is null)
                return Results.NotFound(new { error = $"No order '{orderNumber}'." });

            var result = await sender.Send(new ExpireCheckoutCommand(order.Id, Force: true), ct);

            return result.IsSuccess
                ? Results.Ok(new { Outcome = result.Value.ToString() })
                : Results.Problem(title: result.Error.Code, detail: result.Error.Message, statusCode: 400);
        });
    }
}