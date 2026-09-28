using BookStore.Application.Common;
using BookStore.Application.Payments;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BookStore.Api.Controllers;

public sealed record StoreConfigDto(
    string StoreName,
    string Currency,
    string TermsVersion,
    int CheckoutSessionMinutes,
    bool IsTestMode);

[ApiController]
[Route("api/store")]
public sealed class StoreController(IOptions<StoreOptions> storeOptions, IOptions<PaymentOptions> paymentOptions)
    : ControllerBase
{
    /// Pure configuration, so it reads options directly rather than going
    /// through MediatR: there's no business logic to put in a handler.
    [HttpGet("config")]
    [ProducesResponseType(typeof(StoreConfigDto), StatusCodes.Status200OK)]
    public IActionResult GetConfig() =>
        Ok(new StoreConfigDto(
            storeOptions.Value.Name,
            storeOptions.Value.Currency,
            paymentOptions.Value.CurrentTermsVersion,
            paymentOptions.Value.CheckoutSessionMinutes,
            paymentOptions.Value.Provider == PaymentProvider.Mock));
}