using BookStore.Api.Common;
using BookStore.Api.Contracts;
using BookStore.Application.Catalog;
using BookStore.Application.Catalog.Commands;
using BookStore.Application.Catalog.Queries;
using BookStore.Application.Catalog.Translations;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

public sealed record UpdateCategoryRequest(string Name, string? Letter, string? Description, int? ParentId, int DisplayOrder);

public sealed record UpdateMuhaqqiqRequest(
    string Name, string? Bio, IReadOnlyList<string>? Specialties, bool IsFeatured, int DisplayOrder);

public sealed record CategoryTranslationRequest(string Name, string? Description);
public sealed record MuhaqqiqTranslationRequest(string Name, string? Bio, IReadOnlyList<string>? Specialties);

[ApiController]
[Route("api/admin")]
[Authorize(Roles = nameof(AdminRole.Admin))]
public sealed class AdminCatalogController(ISender sender) : ControllerBase
{
    // ---- Categories ----

    [HttpGet("categories")]
    [ProducesResponseType(typeof(IReadOnlyList<AdminCategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories(CancellationToken ct) =>
        (await sender.Send(new GetAdminCategoriesQuery(), ct)).ToActionResult();

    [HttpPost("categories")]
    [ProducesResponseType(typeof(AdminCategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateCategory(CreateCategoryCommand command, CancellationToken ct) =>
        (await sender.Send(command, ct)).ToActionResult();

    [HttpPut("categories/{id:int}")]
    [ProducesResponseType(typeof(AdminCategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateCategory(int id, UpdateCategoryRequest r, CancellationToken ct) =>
        (await sender.Send(new UpdateCategoryCommand(id, r.Name, r.Letter, r.Description, r.ParentId, r.DisplayOrder), ct))
        .ToActionResult();

    [HttpPut("categories/{id:int}/active")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SetCategoryActive(int id, SetActiveRequest r, CancellationToken ct) =>
        (await sender.Send(new SetCategoryActiveCommand(id, r.IsActive), ct)).ToActionResult();

    [HttpDelete("categories/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteCategory(int id, CancellationToken ct) =>
        (await sender.Send(new DeleteCategoryCommand(id), ct)).ToActionResult();

    // ---- Muhaqqiqs ----

    [HttpGet("muhaqqiqs")]
    [ProducesResponseType(typeof(IReadOnlyList<AdminMuhaqqiqDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMuhaqqiqs(CancellationToken ct) =>
        (await sender.Send(new GetAdminMuhaqqiqsQuery(), ct)).ToActionResult();

    [HttpPost("muhaqqiqs")]
    [ProducesResponseType(typeof(AdminMuhaqqiqDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateMuhaqqiq(CreateMuhaqqiqCommand command, CancellationToken ct) =>
        (await sender.Send(command, ct)).ToActionResult();

    [HttpPut("muhaqqiqs/{id:int}")]
    [ProducesResponseType(typeof(AdminMuhaqqiqDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateMuhaqqiq(int id, UpdateMuhaqqiqRequest r, CancellationToken ct) =>
        (await sender.Send(new UpdateMuhaqqiqCommand(id, r.Name, r.Bio, r.Specialties, r.IsFeatured, r.DisplayOrder), ct))
        .ToActionResult();

    [HttpPut("muhaqqiqs/{id:int}/active")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SetMuhaqqiqActive(int id, SetActiveRequest r, CancellationToken ct) =>
        (await sender.Send(new SetMuhaqqiqActiveCommand(id, r.IsActive), ct)).ToActionResult();

    [HttpDelete("muhaqqiqs/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteMuhaqqiq(int id, CancellationToken ct) =>
        (await sender.Send(new DeleteMuhaqqiqCommand(id), ct)).ToActionResult();

    /// Run once after deploying the search migration; returns the number of books reindexed.
    [HttpPost("catalog/reindex")]
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    public async Task<IActionResult> ReindexSearch(CancellationToken ct) =>
        (await sender.Send(new RebuildSearchIndexCommand(), ct)).ToActionResult();

    /// Converts images uploaded before WebP variants existed. Safe to re-run.
    [HttpPost("catalog/images/regenerate")]
    [ProducesResponseType(typeof(ImageRegenerationResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> RegenerateImages(CancellationToken ct) =>
        (await sender.Send(new RegenerateImageVariantsCommand(), ct)).ToActionResult();

    // ---- Category translations ----

    [HttpGet("categories/{id:int}/translations")]
    [ProducesResponseType(typeof(AdminCategoryTranslationsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategoryTranslations(int id, CancellationToken ct) =>
        (await sender.Send(new GetCategoryTranslationsQuery(id), ct)).ToActionResult();

    [HttpGet("categories/{id:int}/translations/{lang}")]
    [ProducesResponseType(typeof(CategoryTranslationDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategoryTranslation(int id, string lang, CancellationToken ct) =>
        (await sender.Send(new GetCategoryTranslationQuery(id, lang), ct)).ToActionResult();

    [HttpPut("categories/{id:int}/translations/{lang}")]
    [ProducesResponseType(typeof(CategoryTranslationDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetCategoryTranslation(int id, string lang, CategoryTranslationRequest r, CancellationToken ct) =>
        (await sender.Send(new SetCategoryTranslationCommand(id, lang, r.Name, r.Description), ct)).ToActionResult();

    [HttpDelete("categories/{id:int}/translations/{lang}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteCategoryTranslation(int id, string lang, CancellationToken ct) =>
        (await sender.Send(new DeleteCategoryTranslationCommand(id, lang), ct)).ToActionResult();

    // ---- Muhaqqiq translations ----

    [HttpGet("muhaqqiqs/{id:int}/translations")]
    [ProducesResponseType(typeof(AdminMuhaqqiqTranslationsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMuhaqqiqTranslations(int id, CancellationToken ct) =>
        (await sender.Send(new GetMuhaqqiqTranslationsQuery(id), ct)).ToActionResult();

    [HttpGet("muhaqqiqs/{id:int}/translations/{lang}")]
    [ProducesResponseType(typeof(MuhaqqiqTranslationDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMuhaqqiqTranslation(int id, string lang, CancellationToken ct) =>
        (await sender.Send(new GetMuhaqqiqTranslationQuery(id, lang), ct)).ToActionResult();

    [HttpPut("muhaqqiqs/{id:int}/translations/{lang}")]
    [ProducesResponseType(typeof(MuhaqqiqTranslationDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetMuhaqqiqTranslation(int id, string lang, MuhaqqiqTranslationRequest r, CancellationToken ct) =>
        (await sender.Send(new SetMuhaqqiqTranslationCommand(id, lang, r.Name, r.Bio, r.Specialties), ct)).ToActionResult();

    [HttpDelete("muhaqqiqs/{id:int}/translations/{lang}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteMuhaqqiqTranslation(int id, string lang, CancellationToken ct) =>
        (await sender.Send(new DeleteMuhaqqiqTranslationCommand(id, lang), ct)).ToActionResult();


}