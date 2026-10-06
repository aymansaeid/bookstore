using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Legal;
using FluentValidation;

namespace BookStore.Application.Legal.Commands;

public sealed record CreateLegalDraftCommand(
    LegalDocumentType Type, string Language, string Version, string Title, string BodyMarkdown)
    : ICommand<AdminLegalDocumentDto>, IAuditableCommand
{
    public string AuditEntityType => "LegalDocument";
    public string? AuditEntityId => $"{Type}/{Language}/{Version}";

    // Contract bodies can be long; the audit log needs who and which, not the text.
    object IAuditableCommand.AuditDetails => new { Type, Language, Version, Title };
}

public sealed record UpdateLegalDraftCommand(int DocumentId, string Title, string BodyMarkdown)
    : ICommand<AdminLegalDocumentDto>, IAuditableCommand
{
    public string AuditEntityType => "LegalDocument";
    public string? AuditEntityId => DocumentId.ToString();
    object IAuditableCommand.AuditDetails => new { DocumentId, Title };
}

public sealed record PublishLegalDocumentCommand(int DocumentId)
    : ICommand<AdminLegalDocumentDto>, IAuditableCommand
{
    public string AuditEntityType => "LegalDocument";
    public string? AuditEntityId => DocumentId.ToString();
}

public sealed class CreateLegalDraftCommandValidator : AbstractValidator<CreateLegalDraftCommand>
{
    public CreateLegalDraftCommandValidator()
    {
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Language).Must(l => LegalLanguages.Supported.Contains(l))
            .WithMessage("Language must be ar, tr or en.");
        RuleFor(x => x.Version).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(LegalDocument.MaxTitleLength);
        RuleFor(x => x.BodyMarkdown).NotEmpty().MaximumLength(LegalDocument.MaxBodyLength);
    }
}

public sealed class UpdateLegalDraftCommandValidator : AbstractValidator<UpdateLegalDraftCommand>
{
    public UpdateLegalDraftCommandValidator()
    {
        RuleFor(x => x.DocumentId).GreaterThan(0);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(LegalDocument.MaxTitleLength);
        RuleFor(x => x.BodyMarkdown).NotEmpty().MaximumLength(LegalDocument.MaxBodyLength);
    }
}

public sealed class CreateLegalDraftCommandHandler(ILegalDocumentRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<CreateLegalDraftCommand, AdminLegalDocumentDto>
{
    public async Task<Result<AdminLegalDocumentDto>> Handle(CreateLegalDraftCommand command, CancellationToken ct)
    {
        if (await repository.VersionExistsAsync(command.Type, command.Language, command.Version.Trim(), ct))
            return Result.Failure<AdminLegalDocumentDto>(LegalErrors.DuplicateVersion(command.Version.Trim()));

        LegalDocument document;
        try
        {
            document = LegalDocument.CreateDraft(
                command.Type, command.Language, command.Version, command.Title, command.BodyMarkdown);
        }
        catch (ArgumentException ex)
        {
            return Result.Failure<AdminLegalDocumentDto>(LegalErrors.Invalid(ex.Message));
        }

        repository.Add(document);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(document.ToAdminDto());
    }
}

public sealed class UpdateLegalDraftCommandHandler(ILegalDocumentRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<UpdateLegalDraftCommand, AdminLegalDocumentDto>
{
    public async Task<Result<AdminLegalDocumentDto>> Handle(UpdateLegalDraftCommand command, CancellationToken ct)
    {
        var document = await repository.GetByIdAsync(command.DocumentId, ct);
        if (document is null)
            return Result.Failure<AdminLegalDocumentDto>(LegalErrors.NotFound(command.DocumentId));

        if (document.Status != LegalDocumentStatus.Draft)
            return Result.Failure<AdminLegalDocumentDto>(LegalErrors.NotADraft);

        document.EditDraft(command.Title, command.BodyMarkdown);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(document.ToAdminDto());
    }
}

public sealed class PublishLegalDocumentCommandHandler(ILegalDocumentRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<PublishLegalDocumentCommand, AdminLegalDocumentDto>
{
    public async Task<Result<AdminLegalDocumentDto>> Handle(PublishLegalDocumentCommand command, CancellationToken ct)
    {
        var document = await repository.GetByIdAsync(command.DocumentId, ct);
        if (document is null)
            return Result.Failure<AdminLegalDocumentDto>(LegalErrors.NotFound(command.DocumentId));

        if (document.Status != LegalDocumentStatus.Draft)
            return Result.Failure<AdminLegalDocumentDto>(LegalErrors.NotADraft);

        // A typo like {{CustomerNmae}} would print literally into every
        // customer's contract. Refuse to publish it.
        var unknown = LegalTemplateRenderer.UnknownPlaceholders(document.BodyMarkdown);
        if (unknown.Count > 0)
            return Result.Failure<AdminLegalDocumentDto>(LegalErrors.UnknownPlaceholders(unknown));

        var current = await repository.GetPublishedAsync(document.Type, document.Language, ct);

        // Two saves in one transaction: archive the old version FIRST, so the
        // "one published per type and language" index never sees two at once.
        await using var transaction = await unitOfWork.BeginTransactionAsync(ct);

        if (current is not null)
        {
            current.Archive();
            await unitOfWork.SaveChangesAsync(ct);
        }

        document.Publish();
        await unitOfWork.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Result.Success(document.ToAdminDto());
    }
}