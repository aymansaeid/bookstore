using BookStore.Api.Common;
using BookStore.Api.Contracts;
using BookStore.Application.Catalog;
using BookStore.Application.Catalog.Commands;
using BookStore.Application.Catalog.Queries;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

public sealed record UpdateCategoryRequest(string Name, string? Letter, string? Description, int? ParentId, int DisplayOrder);

public sealed record UpdateMuhaqqiqRequest(
    string Name, string? Bio, IReadOnlyList<string>? Specialties, bool IsFeatured, int DisplayOrder);

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
}