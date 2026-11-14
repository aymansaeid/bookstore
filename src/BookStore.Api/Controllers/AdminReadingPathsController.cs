using BookStore.Api.Common;
using BookStore.Api.Contracts;
using BookStore.Application.ReadingPaths;
using BookStore.Application.ReadingPaths.Translations;
using BookStore.Domain.Books;
using BookStore.Domain.ReadingPaths;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

public sealed record SaveReadingPathRequest(
    string Title, string? Slug, string? Description, ReaderLevel Level, int EstimatedWeeks,
    int DiscountPercentage, bool IsFeatured, int DisplayOrder, IReadOnlyList<ReadingPathStageInput> Stages);

public sealed record ReadingPathTranslationRequest(string Title, string? Description, IReadOnlyList<StageReasonInput>? Stages);

[ApiController]
[Route("api/admin/reading-paths")]
[Authorize(Roles = nameof(AdminRole.Admin))]
public sealed class AdminReadingPathsController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminReadingPathDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) =>
        (await sender.Send(new GetAdminReadingPathsQuery(), ct)).ToActionResult();

    [HttpPost]
    [ProducesResponseType(typeof(AdminReadingPathDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(SaveReadingPathRequest r, CancellationToken ct) =>
        (await sender.Send(ToCommand(null, r), ct)).ToActionResult();

    /// Full replacement, stages in order. The slug never changes.
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(AdminReadingPathDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, SaveReadingPathRequest r, CancellationToken ct) =>
        (await sender.Send(ToCommand(id, r), ct)).ToActionResult();

    [HttpPut("{id:int}/active")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SetActive(int id, SetActiveRequest r, CancellationToken ct) =>
        (await sender.Send(new SetReadingPathActiveCommand(id, r.IsActive), ct)).ToActionResult();

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) =>
        (await sender.Send(new DeleteReadingPathCommand(id), ct)).ToActionResult();

    private static SaveReadingPathCommand ToCommand(int? id, SaveReadingPathRequest r) =>
        new(id, r.Title, r.Slug, r.Description, r.Level, r.EstimatedWeeks,
            r.DiscountPercentage, r.IsFeatured, r.DisplayOrder, r.Stages);

    [HttpGet("{id:int}/translations")]
    [ProducesResponseType(typeof(AdminReadingPathTranslationsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTranslations(int id, CancellationToken ct) =>
    (await sender.Send(new GetReadingPathTranslationsQuery(id), ct)).ToActionResult();

    [HttpGet("{id:int}/translations/{lang}")]
    [ProducesResponseType(typeof(ReadingPathTranslationDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTranslation(int id, string lang, CancellationToken ct) =>
        (await sender.Send(new GetReadingPathTranslationQuery(id, lang), ct)).ToActionResult();

    /// Stages: [{ bookId, reason }]. A stage left out falls back to its Arabic reason.
    [HttpPut("{id:int}/translations/{lang}")]
    [ProducesResponseType(typeof(ReadingPathTranslationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetTranslation(int id, string lang, ReadingPathTranslationRequest r, CancellationToken ct) =>
        (await sender.Send(new SetReadingPathTranslationCommand(id, lang, r.Title, r.Description, r.Stages), ct)).ToActionResult();

    [HttpDelete("{id:int}/translations/{lang}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteTranslation(int id, string lang, CancellationToken ct) =>
        (await sender.Send(new DeleteReadingPathTranslationCommand(id, lang), ct)).ToActionResult();

}