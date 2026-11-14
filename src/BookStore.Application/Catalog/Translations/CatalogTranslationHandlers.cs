using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Translations;
using BookStore.Domain.Catalog;
using BookStore.Domain.Common;
using FluentValidation;

namespace BookStore.Application.Catalog.Translations;

// ================= Categories =================

public sealed record CategoryTranslationDto(string Language, string Name, string? Description, DateTimeOffset UpdatedAtUtc);

public sealed record AdminCategoryTranslationsDto(
    int CategoryId, string SourceName, string? SourceDescription,
    IReadOnlyList<CategoryTranslationDto> Translations, IReadOnlyList<string> Missing);

internal static class CategoryTranslationMappings
{
    public static CategoryTranslationDto ToDto(this CategoryTranslation t) =>
        new(t.Language.Code(), t.Name, t.Description, t.UpdatedAtUtc);
}

public sealed record GetCategoryTranslationsQuery(int CategoryId) : IQuery<AdminCategoryTranslationsDto>;

public sealed class GetCategoryTranslationsQueryHandler(ICategoryRepository repository)
    : IQueryHandler<GetCategoryTranslationsQuery, AdminCategoryTranslationsDto>
{
    public async Task<Result<AdminCategoryTranslationsDto>> Handle(GetCategoryTranslationsQuery q, CancellationToken ct)
    {
        var category = await repository.GetByIdAsync(q.CategoryId, ct);
        if (category is null)
            return Result.Failure<AdminCategoryTranslationsDto>(CatalogErrors.CategoryNotFound(q.CategoryId));

        return Result.Success(new AdminCategoryTranslationsDto(
            category.Id, category.Name, category.Description,
            category.Translations.OrderBy(t => t.Language).Select(t => t.ToDto()).ToList(),
            TranslationLanguage.Missing(category.TranslatedLanguages)));
    }
}

public sealed record GetCategoryTranslationQuery(int CategoryId, string Language) : IQuery<CategoryTranslationDto>;

public sealed class GetCategoryTranslationQueryHandler(ICategoryRepository repository)
    : IQueryHandler<GetCategoryTranslationQuery, CategoryTranslationDto>
{
    public async Task<Result<CategoryTranslationDto>> Handle(GetCategoryTranslationQuery q, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(q.Language);
        if (language.IsFailure)
            return Result.Failure<CategoryTranslationDto>(language.Error);

        var category = await repository.GetByIdAsync(q.CategoryId, ct);
        if (category is null)
            return Result.Failure<CategoryTranslationDto>(CatalogErrors.CategoryNotFound(q.CategoryId));

        var t = category.TranslationFor(language.Value);
        return t is null
            ? Result.Failure<CategoryTranslationDto>(TranslationErrors.NotFound("Category", category.Id, language.Value.Code()))
            : Result.Success(t.ToDto());
    }
}

public sealed record SetCategoryTranslationCommand(int CategoryId, string Language, string Name, string? Description)
    : ICommand<CategoryTranslationDto>, IAuditableCommand
{
    public string AuditEntityType => "CategoryTranslation";
    public string? AuditEntityId => $"{CategoryId}/{Language}";
}

public sealed class SetCategoryTranslationCommandValidator : AbstractValidator<SetCategoryTranslationCommand>
{
    public SetCategoryTranslationCommandValidator()
    {
        RuleFor(x => x.CategoryId).GreaterThan(0);
        RuleFor(x => x.Language).NotEmpty().MaximumLength(10);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(Category.MaxNameLength);
        RuleFor(x => x.Description).MaximumLength(Category.MaxDescriptionLength);
    }
}

public sealed class SetCategoryTranslationCommandHandler(ICategoryRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetCategoryTranslationCommand, CategoryTranslationDto>
{
    public async Task<Result<CategoryTranslationDto>> Handle(SetCategoryTranslationCommand c, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(c.Language);
        if (language.IsFailure)
            return Result.Failure<CategoryTranslationDto>(language.Error);

        var category = await repository.GetByIdAsync(c.CategoryId, ct);
        if (category is null)
            return Result.Failure<CategoryTranslationDto>(CatalogErrors.CategoryNotFound(c.CategoryId));

        try
        {
            category.SetTranslation(language.Value, c.Name, c.Description);
        }
        catch (ArgumentException ex)
        {
            return Result.Failure<CategoryTranslationDto>(TranslationErrors.Invalid(ex.Message));
        }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(category.TranslationFor(language.Value)!.ToDto());
    }
}

public sealed record DeleteCategoryTranslationCommand(int CategoryId, string Language) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "CategoryTranslation";
    public string? AuditEntityId => $"{CategoryId}/{Language}";
}

public sealed class DeleteCategoryTranslationCommandHandler(ICategoryRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteCategoryTranslationCommand>
{
    public async Task<Result> Handle(DeleteCategoryTranslationCommand c, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(c.Language);
        if (language.IsFailure)
            return Result.Failure(language.Error);

        var category = await repository.GetByIdAsync(c.CategoryId, ct);
        if (category is null)
            return Result.Failure(CatalogErrors.CategoryNotFound(c.CategoryId));

        if (category.RemoveTranslation(language.Value))
            await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}

// ================= Muhaqqiqs =================

public sealed record MuhaqqiqTranslationDto(
    string Language, string Name, string? Bio, IReadOnlyList<string> Specialties, DateTimeOffset UpdatedAtUtc);

public sealed record AdminMuhaqqiqTranslationsDto(
    int MuhaqqiqId, string SourceName, string? SourceBio, IReadOnlyList<string> SourceSpecialties,
    IReadOnlyList<MuhaqqiqTranslationDto> Translations, IReadOnlyList<string> Missing);

internal static class MuhaqqiqTranslationMappings
{
    public static MuhaqqiqTranslationDto ToDto(this MuhaqqiqTranslation t) =>
        new(t.Language.Code(), t.Name, t.Bio, t.Specialties.ToList(), t.UpdatedAtUtc);
}

public sealed record GetMuhaqqiqTranslationsQuery(int MuhaqqiqId) : IQuery<AdminMuhaqqiqTranslationsDto>;

public sealed class GetMuhaqqiqTranslationsQueryHandler(IMuhaqqiqRepository repository)
    : IQueryHandler<GetMuhaqqiqTranslationsQuery, AdminMuhaqqiqTranslationsDto>
{
    public async Task<Result<AdminMuhaqqiqTranslationsDto>> Handle(GetMuhaqqiqTranslationsQuery q, CancellationToken ct)
    {
        var m = await repository.GetByIdAsync(q.MuhaqqiqId, ct);
        if (m is null)
            return Result.Failure<AdminMuhaqqiqTranslationsDto>(CatalogErrors.MuhaqqiqNotFound(q.MuhaqqiqId));

        return Result.Success(new AdminMuhaqqiqTranslationsDto(
            m.Id, m.Name, m.Bio, m.Specialties.ToList(),
            m.Translations.OrderBy(t => t.Language).Select(t => t.ToDto()).ToList(),
            TranslationLanguage.Missing(m.TranslatedLanguages)));
    }
}

public sealed record GetMuhaqqiqTranslationQuery(int MuhaqqiqId, string Language) : IQuery<MuhaqqiqTranslationDto>;

public sealed class GetMuhaqqiqTranslationQueryHandler(IMuhaqqiqRepository repository)
    : IQueryHandler<GetMuhaqqiqTranslationQuery, MuhaqqiqTranslationDto>
{
    public async Task<Result<MuhaqqiqTranslationDto>> Handle(GetMuhaqqiqTranslationQuery q, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(q.Language);
        if (language.IsFailure)
            return Result.Failure<MuhaqqiqTranslationDto>(language.Error);

        var m = await repository.GetByIdAsync(q.MuhaqqiqId, ct);
        if (m is null)
            return Result.Failure<MuhaqqiqTranslationDto>(CatalogErrors.MuhaqqiqNotFound(q.MuhaqqiqId));

        var t = m.TranslationFor(language.Value);
        return t is null
            ? Result.Failure<MuhaqqiqTranslationDto>(TranslationErrors.NotFound("Muhaqqiq", m.Id, language.Value.Code()))
            : Result.Success(t.ToDto());
    }
}

public sealed record SetMuhaqqiqTranslationCommand(
    int MuhaqqiqId, string Language, string Name, string? Bio, IReadOnlyList<string>? Specialties)
    : ICommand<MuhaqqiqTranslationDto>, IAuditableCommand
{
    public string AuditEntityType => "MuhaqqiqTranslation";
    public string? AuditEntityId => $"{MuhaqqiqId}/{Language}";
    object IAuditableCommand.AuditDetails => new { MuhaqqiqId, Language, Name };
}

public sealed class SetMuhaqqiqTranslationCommandValidator : AbstractValidator<SetMuhaqqiqTranslationCommand>
{
    public SetMuhaqqiqTranslationCommandValidator()
    {
        RuleFor(x => x.MuhaqqiqId).GreaterThan(0);
        RuleFor(x => x.Language).NotEmpty().MaximumLength(10);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(Muhaqqiq.MaxNameLength);
        RuleFor(x => x.Bio).MaximumLength(Muhaqqiq.MaxBioLength);
        RuleFor(x => x.Specialties!.Count).LessThanOrEqualTo(Muhaqqiq.MaxSpecialties).When(x => x.Specialties is not null);
        RuleForEach(x => x.Specialties).MaximumLength(Muhaqqiq.MaxSpecialtyLength);
    }
}

public sealed class SetMuhaqqiqTranslationCommandHandler(IMuhaqqiqRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetMuhaqqiqTranslationCommand, MuhaqqiqTranslationDto>
{
    public async Task<Result<MuhaqqiqTranslationDto>> Handle(SetMuhaqqiqTranslationCommand c, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(c.Language);
        if (language.IsFailure)
            return Result.Failure<MuhaqqiqTranslationDto>(language.Error);

        var m = await repository.GetByIdAsync(c.MuhaqqiqId, ct);
        if (m is null)
            return Result.Failure<MuhaqqiqTranslationDto>(CatalogErrors.MuhaqqiqNotFound(c.MuhaqqiqId));

        try
        {
            m.SetTranslation(language.Value, c.Name, c.Bio, c.Specialties);
        }
        catch (ArgumentException ex)
        {
            return Result.Failure<MuhaqqiqTranslationDto>(TranslationErrors.Invalid(ex.Message));
        }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(m.TranslationFor(language.Value)!.ToDto());
    }
}

public sealed record DeleteMuhaqqiqTranslationCommand(int MuhaqqiqId, string Language) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "MuhaqqiqTranslation";
    public string? AuditEntityId => $"{MuhaqqiqId}/{Language}";
}

public sealed class DeleteMuhaqqiqTranslationCommandHandler(IMuhaqqiqRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteMuhaqqiqTranslationCommand>
{
    public async Task<Result> Handle(DeleteMuhaqqiqTranslationCommand c, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(c.Language);
        if (language.IsFailure)
            return Result.Failure(language.Error);

        var m = await repository.GetByIdAsync(c.MuhaqqiqId, ct);
        if (m is null)
            return Result.Failure(CatalogErrors.MuhaqqiqNotFound(c.MuhaqqiqId));

        if (m.RemoveTranslation(language.Value))
            await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}