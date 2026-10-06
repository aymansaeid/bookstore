using BookStore.Api.Common;
using BookStore.Application.Legal;
using BookStore.Application.Legal.Commands;
using BookStore.Application.Legal.Queries;
using BookStore.Domain.Legal;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Controllers;

public sealed record UpdateLegalDraftRequest(string Title, string BodyMarkdown);

[ApiController]
[Route("api/admin/legal")]
[Authorize(Roles = nameof(AdminRole.Admin))]
public sealed class AdminLegalController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminLegalDocumentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] LegalDocumentType? type, [FromQuery] string? lang, CancellationToken ct) =>
        (await sender.Send(new ListLegalDocumentsQuery(type, lang), ct)).ToActionResult();

    /// Every placeholder a template may use, with descriptions: the editor's help panel.
    [HttpGet("placeholders")]
    [ProducesResponseType(typeof(IReadOnlyDictionary<string, string>), StatusCodes.Status200OK)]
    public IActionResult Placeholders() => Ok(LegalPlaceholders.All);

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AdminLegalDocumentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) =>
        (await sender.Send(new GetLegalDocumentQuery(id), ct)).ToActionResult();

    [HttpPost]
    [ProducesResponseType(typeof(AdminLegalDocumentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateDraft(CreateLegalDraftCommand command, CancellationToken ct) =>
        (await sender.Send(command, ct)).ToActionResult();

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(AdminLegalDocumentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateDraft(int id, UpdateLegalDraftRequest r, CancellationToken ct) =>
        (await sender.Send(new UpdateLegalDraftCommand(id, r.Title, r.BodyMarkdown), ct)).ToActionResult();

    /// Makes this draft live and archives the previous version.
    [HttpPost("{id:int}/publish")]
    [ProducesResponseType(typeof(AdminLegalDocumentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Publish(int id, CancellationToken ct) =>
        (await sender.Send(new PublishLegalDocumentCommand(id), ct)).ToActionResult();
}