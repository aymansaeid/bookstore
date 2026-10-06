using BookStore.Application.Common;
using BookStore.Application.Legal.Queries;
using BookStore.Application.Payments;
using MediatR;
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
public sealed class StoreController(
    ISender sender, IOptions<StoreOptions> storeOptions, IOptions<PaymentOptions> paymentOptions) : ControllerBase
{
    /// ?lang=ar|tr|en selects which language's contract version to accept.
    [HttpGet("config")]
    [ProducesResponseType(typeof(StoreConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConfig([FromQuery] string? lang, CancellationToken ct)
    {
        var termsVersion = (await sender.Send(new GetCurrentTermsVersionQuery(lang), ct)).Value;

        return Ok(new StoreConfigDto(
            storeOptions.Value.Name,
            storeOptions.Value.Currency,
            termsVersion,
            paymentOptions.Value.CheckoutSessionMinutes,
            paymentOptions.Value.Provider == PaymentProvider.Mock));
    }
}