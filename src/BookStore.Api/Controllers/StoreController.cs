using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Common;
using BookStore.Application.Legal.Queries;
using BookStore.Application.Payments;
using BookStore.Application.Store;
using BookStore.Domain.Common;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BookStore.Api.Controllers;

public sealed record StoreConfigDto(
    string StoreName,
    string Currency,
    string TermsVersion,
    int CheckoutSessionMinutes,
    bool IsTestMode,
    string Language,
    string? TermsLanguage,
    bool TermsAvailable,
    string? Announcement,
    IReadOnlyList<string> SupportedLanguages);

[ApiController]
[Route("api/store")]
public sealed class StoreController(
    ISender sender, IOptions<StoreOptions> storeOptions, IOptions<PaymentOptions> paymentOptions , ILanguageContext languageContext) : ControllerBase
{
    /// ?lang= wins when sent; otherwise Accept-Language.
    [HttpGet("config")]
    [ProducesResponseType(typeof(StoreConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConfig([FromQuery] string? lang, CancellationToken ct)
    {
        var language = Languages.TryParse(lang, out var requested) ? requested : languageContext.Current;
        var terms = (await sender.Send(new GetCheckoutTermsQuery(language), ct)).Value;
        var store = storeOptions.Value;

        return Ok(new StoreConfigDto(
            store.NameIn(language),
            store.Currency,
            terms.Version,
            paymentOptions.Value.CheckoutSessionMinutes,
            paymentOptions.Value.Provider == PaymentProvider.Mock,
            language.Code(),
            terms.Language,
            terms.Available,
            store.AnnouncementIn(language),
            Languages.All.Codes()));
    }

    /// Home hero «أرقام الثقة». Cached 10 minutes.
    [HttpGet("stats")]
    [ProducesResponseType(typeof(StoreStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats(CancellationToken ct)
    {
        var result = await sender.Send(new GetStoreStatsQuery(), ct);

        return result.IsSuccess
            ? Ok(result.Value)
            : BadRequest(result.Error);

        // Alternatively, if you know this query never fails, you can just do:
        // return Ok((await sender.Send(new GetStoreStatsQuery(), ct)).Value);
    }
}