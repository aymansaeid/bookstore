using BookStore.Application.Payments.Commands;
using BookStore.Infrastructure.Payments;
using MediatR;

namespace BookStore.Api.Extensions;

public static class DevPaymentEndpoints
{
    public static void MapDevPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dev/payments").WithTags("Dev: Mock Payments");

        // What the mock checkout page shows before "paying".
        group.MapGet("/{sessionId}", (string sessionId, MockPaymentState state) =>
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

        // Simulates the gateway telling us a payment succeeded. Pass the same
        // eventId twice to test idempotency.
        group.MapPost("/{sessionId}/simulate-paid", async (
            string sessionId,
            string? eventId,
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
    }
}