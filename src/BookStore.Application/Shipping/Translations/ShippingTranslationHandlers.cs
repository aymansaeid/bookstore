using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Translations;
using BookStore.Domain.Common;
using BookStore.Domain.Shipping;
using FluentValidation;

namespace BookStore.Application.Shipping.Translations;

public sealed record OptionNameInput(string Code, string? Name);

/// SourceName is the Arabic name; Name is the translation (null = falls back).
public sealed record ShippingOptionNameDto(string Code, string SourceName, string? Name);

public sealed record ShippingZoneTranslationDto(string Language, IReadOnlyList<ShippingOptionNameDto> Options);

/// Complete: languages where every extra option has a name.
public sealed record AdminShippingZoneTranslationsDto(
    int ZoneId, IReadOnlyList<ShippingZoneTranslationDto> Translations,
    IReadOnlyList<string> Complete, IReadOnlyList<string> Missing);

internal static class ShippingTranslationMappings
{
    public static ShippingZoneTranslationDto ToTranslationDto(this ShippingZone zone, Language language) =>
        new(language.Code(), zone.Options
            .OrderBy(o => o.DisplayOrder)
            .Select(o => new ShippingOptionNameDto(o.Code, o.Name,
                zone.OptionTranslations.FirstOrDefault(t => t.Language == language && t.Code == o.Code)?.Name))
            .ToList());
}

public sealed record GetShippingZoneTranslationsQuery(int ZoneId) : IQuery<AdminShippingZoneTranslationsDto>;

public sealed class GetShippingZoneTranslationsQueryHandler(IShippingZoneRepository repository)
    : IQueryHandler<GetShippingZoneTranslationsQuery, AdminShippingZoneTranslationsDto>
{
    public async Task<Result<AdminShippingZoneTranslationsDto>> Handle(GetShippingZoneTranslationsQuery q, CancellationToken ct)
    {
        var zone = await repository.GetByIdAsync(q.ZoneId, ct);
        if (zone is null)
            return Result.Failure<AdminShippingZoneTranslationsDto>(ShippingZoneErrors.NotFound(q.ZoneId));

        var complete = zone.CompleteTranslationLanguages();

        return Result.Success(new AdminShippingZoneTranslationsDto(
            zone.Id,
            Languages.Translatable.Select(zone.ToTranslationDto).ToList(),
            complete.Codes(),
            TranslationLanguage.Missing(complete)));
    }
}

public sealed record GetShippingZoneTranslationQuery(int ZoneId, string Language) : IQuery<ShippingZoneTranslationDto>;

public sealed class GetShippingZoneTranslationQueryHandler(IShippingZoneRepository repository)
    : IQueryHandler<GetShippingZoneTranslationQuery, ShippingZoneTranslationDto>
{
    public async Task<Result<ShippingZoneTranslationDto>> Handle(GetShippingZoneTranslationQuery q, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(q.Language);
        if (language.IsFailure)
            return Result.Failure<ShippingZoneTranslationDto>(language.Error);

        var zone = await repository.GetByIdAsync(q.ZoneId, ct);
        return zone is null
            ? Result.Failure<ShippingZoneTranslationDto>(ShippingZoneErrors.NotFound(q.ZoneId))
            : Result.Success(zone.ToTranslationDto(language.Value));
    }
}

public sealed record SetShippingZoneTranslationCommand(int ZoneId, string Language, IReadOnlyList<OptionNameInput> Options)
    : ICommand<ShippingZoneTranslationDto>, IAuditableCommand
{
    public string AuditEntityType => "ShippingZoneTranslation";
    public string? AuditEntityId => $"{ZoneId}/{Language}";
}

public sealed class SetShippingZoneTranslationCommandValidator : AbstractValidator<SetShippingZoneTranslationCommand>
{
    public SetShippingZoneTranslationCommandValidator()
    {
        RuleFor(x => x.ZoneId).GreaterThan(0);
        RuleFor(x => x.Language).NotEmpty().MaximumLength(10);
        RuleFor(x => x.Options).NotNull();
        RuleFor(x => x.Options.Count).LessThanOrEqualTo(ShippingZone.MaxOptions).When(x => x.Options is not null);
        RuleFor(x => x.Options)
            .Must(o => o.Select(x => x.Code.Trim().ToLowerInvariant()).Distinct().Count() == o.Count)
            .When(x => x.Options is not null)
            .WithMessage("Each option code can appear only once.");
        RuleForEach(x => x.Options).ChildRules(option =>
        {
            option.RuleFor(o => o.Code).NotEmpty().MaximumLength(30);
            option.RuleFor(o => o.Name).MaximumLength(ShippingZone.MaxOptionNameLength);
        });
    }
}

public sealed class SetShippingZoneTranslationCommandHandler(IShippingZoneRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetShippingZoneTranslationCommand, ShippingZoneTranslationDto>
{
    public async Task<Result<ShippingZoneTranslationDto>> Handle(SetShippingZoneTranslationCommand c, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(c.Language);
        if (language.IsFailure)
            return Result.Failure<ShippingZoneTranslationDto>(language.Error);

        var zone = await repository.GetByIdAsync(c.ZoneId, ct);
        if (zone is null)
            return Result.Failure<ShippingZoneTranslationDto>(ShippingZoneErrors.NotFound(c.ZoneId));

        try
        {
            zone.SetOptionTranslations(language.Value, c.Options.ToDictionary(o => o.Code, o => o.Name));
        }
        catch (ArgumentException ex)
        {
            return Result.Failure<ShippingZoneTranslationDto>(TranslationErrors.Invalid(ex.Message));
        }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(zone.ToTranslationDto(language.Value));
    }
}

public sealed record DeleteShippingZoneTranslationCommand(int ZoneId, string Language) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "ShippingZoneTranslation";
    public string? AuditEntityId => $"{ZoneId}/{Language}";
}

public sealed class DeleteShippingZoneTranslationCommandHandler(IShippingZoneRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteShippingZoneTranslationCommand>
{
    public async Task<Result> Handle(DeleteShippingZoneTranslationCommand c, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(c.Language);
        if (language.IsFailure)
            return Result.Failure(language.Error);

        var zone = await repository.GetByIdAsync(c.ZoneId, ct);
        if (zone is null)
            return Result.Failure(ShippingZoneErrors.NotFound(c.ZoneId));

        if (zone.RemoveOptionTranslations(language.Value))
            await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}