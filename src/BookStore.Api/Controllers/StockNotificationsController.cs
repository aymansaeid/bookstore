using BookStore.Api.Common;
using BookStore.Application.Notifications.Commands;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BookStore.Api.Controllers;

public sealed record NotifyMeRequest(int BookId, string Email);
public sealed record ConfirmNotificationRequest(string Token);

[ApiController]
[Route("api/stock-notifications")]
public sealed class StockNotificationsController(ISender sender) : ControllerBase
{
    [HttpPost("subscribe")]
    [EnableRateLimiting("customer-auth")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Subscribe(NotifyMeRequest r, CancellationToken ct) =>
        (await sender.Send(new SubscribeToStockNotificationCommand(r.BookId, r.Email), ct)).ToActionResult();

    [HttpPost("confirm")]
    [ProducesResponseType(typeof(ConfirmedSubscriptionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Confirm(ConfirmNotificationRequest r, CancellationToken ct) =>
        (await sender.Send(new ConfirmStockNotificationCommand(r.Token), ct)).ToActionResult();

    [HttpPost("unsubscribe")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Unsubscribe(ConfirmNotificationRequest r, CancellationToken ct) =>
        (await sender.Send(new UnsubscribeFromStockNotificationCommand(r.Token), ct)).ToActionResult();
}