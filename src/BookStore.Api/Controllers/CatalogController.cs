using BookStore.Api.Common;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Catalog;
using BookStore.Application.Catalog.Queries;
using BookStore.Application.Catalog.Search;
using BookStore.Domain.Books;
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

    /// Search, category pages and muhaqqiq pages all use this. Repeat
    /// `muhaqqiq` and `level` for several values. Ask for facets=true only when
    /// filters change, not on every page turn.
    [HttpGet("catalog/search")]
    [ProducesResponseType(typeof(CatalogSearchResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromQuery] string? category,
        [FromQuery(Name = "muhaqqiq")] string[]? muhaqqiqs,
        [FromQuery(Name = "level")] ReaderLevel[]? levels,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] int? minVolumes,
        [FromQuery] int? maxVolumes,
        [FromQuery] BookBadges? badge,
        [FromQuery] CatalogSort? sort,
        CancellationToken ct,
        [FromQuery] bool inStock = false,
        [FromQuery] bool installments = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        [FromQuery] bool facets = false) =>
        (await sender.Send(new SearchCatalogQuery(
            q, category, muhaqqiqs, levels, minPrice, maxPrice, minVolumes, maxVolumes,
            inStock, installments, badge, sort, page, pageSize, facets), ct)).ToActionResult();
}