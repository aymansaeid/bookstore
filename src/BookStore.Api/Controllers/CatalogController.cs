using BookStore.Api.Common;
using BookStore.Application.Catalog;
using BookStore.Application.Catalog.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class CatalogController(ISender sender) : ControllerBase
{
    /// Home tiles («تصفّح بحسب العلم»), menus and filter lists.
    [HttpGet("categories")]
    [ProducesResponseType(typeof(IReadOnlyList<PublicCategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories(CancellationToken ct) =>
        (await sender.Send(new GetCategoryTreeQuery(), ct)).ToActionResult();

    [HttpGet("categories/{slug}")]
    [ProducesResponseType(typeof(PublicCategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCategory(string slug, CancellationToken ct) =>
        (await sender.Send(new GetCategoryBySlugQuery(slug), ct)).ToActionResult();

    /// ?featured=true for the home page's «أعلام المحققين».
    [HttpGet("muhaqqiqs")]
    [ProducesResponseType(typeof(IReadOnlyList<PublicMuhaqqiqDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMuhaqqiqs(CancellationToken ct, [FromQuery] bool featured = false) =>
        (await sender.Send(new GetMuhaqqiqsQuery(featured), ct)).ToActionResult();

    [HttpGet("muhaqqiqs/{slug}")]
    [ProducesResponseType(typeof(PublicMuhaqqiqDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMuhaqqiq(string slug, CancellationToken ct) =>
        (await sender.Send(new GetMuhaqqiqBySlugQuery(slug), ct)).ToActionResult();
}