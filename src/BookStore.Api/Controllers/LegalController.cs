using BookStore.Api.Common;
using BookStore.Application.Legal;
using BookStore.Application.Legal.Queries;
using BookStore.Application.Orders.Checkout;
using BookStore.Domain.Legal;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using BookStore.Infrastructure.Auth;
using Microsoft.IdentityModel.JsonWebTokens;

namespace BookStore.Api.Controllers;

public sealed record LegalPreviewRequest(string? Language, QuoteRequest Quote, BuyerDetails Buyer);

[ApiController]
[Route("api/legal")]
public sealed class LegalController(ISender sender) : ControllerBase
{
    /// The live text of a document, e.g. /api/legal/PrivacyNotice?lang=ar,
    /// for footer links. Order-specific fields show "—".
    [HttpGet("{type}")]
    [ProducesResponseType(typeof(PublishedLegalDocumentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(LegalDocumentType type, [FromQuery] string? lang, CancellationToken ct) =>
        (await sender.Send(new GetPublishedLegalDocumentQuery(type, lang), ct)).ToActionResult();

    /// The pre-information form and contract filled in with the current
    /// cart, for display before the pay button.
    [HttpPost("checkout-preview")]
    [EnableRateLimiting("quote")]
    [ProducesResponseType(typeof(CheckoutLegalPreviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CheckoutPreview(LegalPreviewRequest r, CancellationToken ct)
    {
        var auth = await HttpContext.AuthenticateAsync(CustomerTokenGenerator.CustomerScheme);
        int? customerId = auth.Succeeded ? int.Parse(auth.Principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!) : null;

        var quote = new QuoteCheckoutQuery(
            r.Quote.Lines, r.Quote.CountryCode, r.Quote.SavedAddressId, r.Quote.CouponCode,
            r.Quote.ShippingMethod, r.Quote.GiftWrap, customerId);

        return (await sender.Send(new PreviewCheckoutLegalQuery(r.Language, quote, r.Buyer), ct)).ToActionResult();
    }
}