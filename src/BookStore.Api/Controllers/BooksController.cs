using BookStore.Api.Common;
using BookStore.Application.Books;
using BookStore.Application.Books.Queries;
using BookStore.Application.Reviews;
using BookStore.Application.Reviews.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

[ApiController]
[Route("api/books")]
public sealed class BooksController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<PublicBookDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        (await sender.Send(new GetPublicBooksQuery(), ct)).ToActionResult();

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PublicBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        (await sender.Send(new GetPublicBookByIdQuery(id), ct)).ToActionResult();

    // Route constraint keeps this from swallowing /api/books/123, which the
    // int route above handles.
    [HttpGet("{slug:regex(^[[a-z0-9-]]+$)}")]
    [ProducesResponseType(typeof(PublicBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct) =>
        (await sender.Send(new GetPublicBookBySlugQuery(slug), ct)).ToActionResult();

    [HttpGet("{id:int}/reviews")]
    [ProducesResponseType(typeof(BookReviewsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReviews(
    int id,
    CancellationToken ct,
    [FromQuery] ReviewSort sort = ReviewSort.Newest,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 10) =>
    (await sender.Send(new GetBookReviewsQuery(id, sort, page, pageSize), ct)).ToActionResult();
}