using BookStore.Api.Common;
using BookStore.Application.Books;
using BookStore.Application.Books.Queries;
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
}