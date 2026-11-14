using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Translations;
using BookStore.Domain.Common;
using BookStore.Domain.ReadingPaths;
using FluentValidation;

namespace BookStore.Application.ReadingPaths.Translations;

public sealed record StageTranslationDto(int StageNumber, int BookId, string SourceReason, string? Reason);

public sealed record ReadingPathTranslationDto(
    string Language, string Title, string? Description, IReadOnlyList<StageTranslationDto> Stages, DateTimeOffset UpdatedAtUtc);

public sealed record AdminReadingPathTranslationsDto(
    int ReadingPathId, string SourceTitle, string? SourceDescription,
    IReadOnlyList<ReadingPathTranslationDto> Translations, IReadOnlyList<string> Missing);

internal static class ReadingPathTranslationMappings
{
    public static ReadingPathTranslationDto ToTranslationDto(this ReadingPath path, ReadingPathTranslation t) =>
        new(t.Language.Code(), t.Title, t.Description,
            path.OrderedStages.Select(s => new StageTranslationDto(
                s.StageNumber, s.BookId, s.Reason,
                path.StageTranslations.FirstOrDefault(st => st.Language == t.Language && st.BookId == s.BookId)?.Reason))
            .ToList(),
            t.UpdatedAtUtc);
}

public sealed record GetReadingPathTranslationsQuery(int ReadingPathId) : IQuery<AdminReadingPathTranslationsDto>;

public sealed class GetReadingPathTranslationsQueryHandler(IReadingPathRepository repository)
    : IQueryHandler<GetReadingPathTranslationsQuery, AdminReadingPathTranslationsDto>
{
    public async Task<Result<AdminReadingPathTranslationsDto>> Handle(GetReadingPathTranslationsQuery q, CancellationToken ct)
    {
        var path = await repository.GetByIdAsync(q.ReadingPathId, ct);
        if (path is null)
            return Result.Failure<AdminReadingPathTranslationsDto>(ReadingPathErrors.NotFound(q.ReadingPathId));

        return Result.Success(new AdminReadingPathTranslationsDto(
            path.Id, path.Title, path.Description,
            path.Translations.OrderBy(t => t.Language).Select(t => path.ToTranslationDto(t)).ToList(),
            TranslationLanguage.Missing(path.TranslatedLanguages)));
    }
}

public sealed record GetReadingPathTranslationQuery(int ReadingPathId, string Language) : IQuery<ReadingPathTranslationDto>;

public sealed class GetReadingPathTranslationQueryHandler(IReadingPathRepository repository)
    : IQueryHandler<GetReadingPathTranslationQuery, ReadingPathTranslationDto>
{
    public async Task<Result<ReadingPathTranslationDto>> Handle(GetReadingPathTranslationQuery q, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(q.Language);
        if (language.IsFailure)
            return Result.Failure<ReadingPathTranslationDto>(language.Error);

        var path = await repository.GetByIdAsync(q.ReadingPathId, ct);
        if (path is null)
            return Result.Failure<ReadingPathTranslationDto>(ReadingPathErrors.NotFound(q.ReadingPathId));

        var t = path.TranslationFor(language.Value);
        return t is null
            ? Result.Failure<ReadingPathTranslationDto>(TranslationErrors.NotFound("ReadingPath", path.Id, language.Value.Code()))
            : Result.Success(path.ToTranslationDto(t));
    }
}

public sealed record SetReadingPathTranslationCommand(
    int ReadingPathId, string Language, string Title, string? Description, IReadOnlyList<StageReasonInput>? Stages)
    : ICommand<ReadingPathTranslationDto>, IAuditableCommand
{
    public string AuditEntityType => "ReadingPathTranslation";
    public string? AuditEntityId => $"{ReadingPathId}/{Language}";
    object IAuditableCommand.AuditDetails => new { ReadingPathId, Language, Title };
}

public sealed class SetReadingPathTranslationCommandValidator : AbstractValidator<SetReadingPathTranslationCommand>
{
    public SetReadingPathTranslationCommandValidator()
    {
        RuleFor(x => x.ReadingPathId).GreaterThan(0);
        RuleFor(x => x.Language).NotEmpty().MaximumLength(10);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(ReadingPath.MaxTitleLength);
        RuleFor(x => x.Description).MaximumLength(ReadingPath.MaxDescriptionLength);
        RuleFor(x => x.Stages!.Count).LessThanOrEqualTo(ReadingPath.MaxStages).When(x => x.Stages is not null);
        RuleForEach(x => x.Stages).ChildRules(stage =>
        {
            stage.RuleFor(s => s.BookId).GreaterThan(0);
            stage.RuleFor(s => s.Reason).MaximumLength(ReadingPath.MaxReasonLength);
        });
    }
}

public sealed class SetReadingPathTranslationCommandHandler(IReadingPathRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetReadingPathTranslationCommand, ReadingPathTranslationDto>
{
    public async Task<Result<ReadingPathTranslationDto>> Handle(SetReadingPathTranslationCommand c, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(c.Language);
        if (language.IsFailure)
            return Result.Failure<ReadingPathTranslationDto>(language.Error);

        var path = await repository.GetByIdAsync(c.ReadingPathId, ct);
        if (path is null)
            return Result.Failure<ReadingPathTranslationDto>(ReadingPathErrors.NotFound(c.ReadingPathId));

        try
        {
            path.SetTranslation(language.Value, c.Title, c.Description, c.Stages ?? []);
        }
        catch (ArgumentException ex)
        {
            return Result.Failure<ReadingPathTranslationDto>(TranslationErrors.Invalid(ex.Message));
        }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(path.ToTranslationDto(path.TranslationFor(language.Value)!));
    }
}

public sealed record DeleteReadingPathTranslationCommand(int ReadingPathId, string Language) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "ReadingPathTranslation";
    public string? AuditEntityId => $"{ReadingPathId}/{Language}";
}

public sealed class DeleteReadingPathTranslationCommandHandler(IReadingPathRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteReadingPathTranslationCommand>
{
    public async Task<Result> Handle(DeleteReadingPathTranslationCommand c, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(c.Language);
        if (language.IsFailure)
            return Result.Failure(language.Error);

        var path = await repository.GetByIdAsync(c.ReadingPathId, ct);
        if (path is null)
            return Result.Failure(ReadingPathErrors.NotFound(c.ReadingPathId));

        if (path.RemoveTranslation(language.Value))
            await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}