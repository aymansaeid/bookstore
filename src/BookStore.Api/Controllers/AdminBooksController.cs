using BookStore.Api.Common;
using BookStore.Application.Books;
using BookStore.Application.Books.Commands;
using BookStore.Application.Books.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

public sealed record UpdateBookRequest(string Title, string Author, string? Isbn, string? Description, decimal Price);
public sealed record AdjustStockRequest(int NewStockQuantity);
public sealed record SetActiveRequest(bool IsActive);

// TODO (step 6): [Authorize(Roles = "Admin")] goes here once JWT auth exists.
[ApiController]
[Route("api/admin/books")]
public sealed class AdminBooksController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminBookDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        (await sender.Send(new GetAdminBooksQuery(), ct)).ToActionResult();

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AdminBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        (await sender.Send(new GetAdminBookByIdQuery(id), ct)).ToActionResult();

    [HttpPost]
    [ProducesResponseType(typeof(AdminBookDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(CreateBookCommand command, CancellationToken ct)
    {
        var result = await sender.Send(command, ct);
        return result.IsSuccess
            ? CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value)
            : result.Error.ToProblem();
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(AdminBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(int id, UpdateBookRequest request, CancellationToken ct) =>
        (await sender.Send(new UpdateBookCommand(
            id, request.Title, request.Author, request.Isbn, request.Description, request.Price), ct))
        .ToActionResult();

    [HttpPut("{id:int}/stock")]
    [ProducesResponseType(typeof(AdminBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AdjustStock(int id, AdjustStockRequest request, CancellationToken ct) =>
        (await sender.Send(new AdjustBookStockCommand(id, request.NewStockQuantity), ct)).ToActionResult();

    [HttpPut("{id:int}/active")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetActive(int id, SetActiveRequest request, CancellationToken ct) =>
        (await sender.Send(new SetBookActiveCommand(id, request.IsActive), ct)).ToActionResult();
}