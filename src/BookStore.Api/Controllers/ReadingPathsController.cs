using System.Security.Claims;
using BookStore.Api.Common;
using BookStore.Application.ReadingPaths;
using BookStore.Infrastructure.Auth;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace BookStore.Api.Controllers;

[ApiController]
[Route("api/reading-paths")]
public sealed class ReadingPathsController(ISender sender) : ControllerBase
{
    /// ?featured=true for the home page's three cards.
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ReadingPathSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, [FromQuery] bool featured = false) =>
        (await sender.Send(new GetReadingPathsQuery(featured), ct)).ToActionResult();

    /// Anonymous, but a customer token adds owned books, progress and the
    /// remaining price.
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(ReadingPathDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string slug, CancellationToken ct)
    {
        var auth = await HttpContext.AuthenticateAsync(CustomerTokenGenerator.CustomerScheme);
        int? customerId = auth.Succeeded ? int.Parse(auth.Principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!) : null;

        return (await sender.Send(new GetReadingPathBySlugQuery(slug, customerId), ct)).ToActionResult();
    }
}