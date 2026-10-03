using BookStore.Api.Common;
using BookStore.Api.Contracts;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Books;
using BookStore.Application.Books.Commands;
using BookStore.Application.Books.Queries;
using BookStore.Domain.Books;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

public sealed record UpdateBookRequest(
    string Title, string? Subtitle, string Author, string? Description,
    BookFormat Format, int PageCount, string Language, string? Publisher, DateOnly? PublicationDate,
    int WeightGrams, int HeightMm, int WidthMm, int DepthMm, decimal Price);

public sealed record AdjustStockRequest(int NewStockQuantity, string Note);
public sealed record ReorderImagesRequest(IReadOnlyList<int> ImageIdsInOrder);
public sealed record SetTaxonomyRequest(int? CategoryId, IReadOnlyList<int> MuhaqqiqIds);
public sealed record SetMerchandisingRequest(
    ReaderLevel? Level,
    int? Volumes,
    decimal? CompareAtPrice,
    bool InstallmentsAllowed,
    IReadOnlyList<string>? Highlights,
    IReadOnlyList<BookBadges>? Badges,
    string? EditionLabel);

public sealed record SetBookIdsRequest(IReadOnlyList<int> BookIds);

[ApiController]
[Route("api/admin/books")]
[Authorize(Roles = nameof(AdminRole.Admin))]
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
    public async Task<IActionResult> Update(int id, UpdateBookRequest r, CancellationToken ct) =>
        (await sender.Send(new UpdateBookCommand(
            id, r.Title, r.Subtitle, r.Author, r.Description, r.Format, r.PageCount, r.Language,
            r.Publisher, r.PublicationDate, r.WeightGrams, r.HeightMm, r.WidthMm, r.DepthMm, r.Price), ct))
        .ToActionResult();

    [HttpPut("{id:int}/stock")]
    [ProducesResponseType(typeof(AdminBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AdjustStock(int id, AdjustStockRequest request, CancellationToken ct) =>
    (await sender.Send(new AdjustBookStockCommand(id, request.NewStockQuantity, request.Note), ct)).ToActionResult();

    [HttpPut("{id:int}/active")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetActive(int id, SetActiveRequest request, CancellationToken ct) =>
        (await sender.Send(new SetBookActivityCommand(id, request.IsActive), ct)).ToActionResult();

    [HttpPost("{id:int}/images")]
    [RequestSizeLimit(ImageValidation.MaxSizeBytes)]
    [ProducesResponseType(typeof(BookImageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UploadImage(
        int id, IFormFile file, [FromForm] string altText, CancellationToken ct)
    {
        if (file is null || file.Length == 0 || file.Length > ImageValidation.MaxSizeBytes)
            return BookErrors.InvalidImage.ToProblem();

        // Magic-byte check: the real content type comes from the file's own
        // bytes, never from the extension or the client-sent header.
        await using var stream = file.OpenReadStream();

        var header = new byte[12];
        var read = await stream.ReadAsync(header, ct);
        if (read < 12 || !ImageValidation.HasValidImageSignature(header, out var detectedContentType))
            return BookErrors.InvalidImage.ToProblem();

        stream.Position = 0;

        return (await sender.Send(
            new UploadBookImageCommand(id, stream, detectedContentType, altText), ct)).ToActionResult();
    }

    [HttpDelete("{id:int}/images/{imageId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteImage(int id, int imageId, CancellationToken ct) =>
        (await sender.Send(new DeleteBookImageCommand(id, imageId), ct)).ToActionResult();

    [HttpPut("{id:int}/images/{imageId:int}/cover")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetCover(int id, int imageId, CancellationToken ct) =>
        (await sender.Send(new SetBookCoverImageCommand(id, imageId), ct)).ToActionResult();

    [HttpPut("{id:int}/images/order")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReorderImages(int id, ReorderImagesRequest request, CancellationToken ct) =>
        (await sender.Send(new ReorderBookImagesCommand(id, request.ImageIdsInOrder), ct)).ToActionResult();

    /// Category and muhaqqiqs for a book. MuhaqqiqIds in credit order; send
    /// the full list each time (it replaces the previous one).
    [HttpPut("{id:int}/taxonomy")]
    [ProducesResponseType(typeof(AdminBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetTaxonomy(int id, SetTaxonomyRequest request, CancellationToken ct) =>
        (await sender.Send(new SetBookTaxonomyCommand(id, request.CategoryId, request.MuhaqqiqIds), ct)).ToActionResult();

    /// Full replacement: send every field each time. Null clears it.
    [HttpPut("{id:int}/merchandising")]
    [ProducesResponseType(typeof(AdminBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetMerchandising(int id, SetMerchandisingRequest r, CancellationToken ct) =>
        (await sender.Send(new SetBookMerchandisingCommand(
            id, r.Level, r.Volumes, r.CompareAtPrice, r.InstallmentsAllowed, r.Highlights, r.Badges, r.EditionLabel), ct))
        .ToActionResult();

    /// The OTHER editions of this book; an empty list removes it from its group.
    [HttpPut("{id:int}/editions")]
    [ProducesResponseType(typeof(AdminBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SetEditions(int id, SetBookIdsRequest r, CancellationToken ct) =>
        (await sender.Send(new SetBookEditionsCommand(id, r.BookIds), ct)).ToActionResult();

    /// Curated "complements your library" list, in display order.
    [HttpPut("{id:int}/related")]
    [ProducesResponseType(typeof(AdminBookDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetRelated(int id, SetBookIdsRequest r, CancellationToken ct) =>
        (await sender.Send(new SetRelatedBooksCommand(id, r.BookIds), ct)).ToActionResult();
}