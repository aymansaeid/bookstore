using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Books;
using BookStore.Domain.Catalog;
using FluentValidation;

namespace BookStore.Application.Catalog.Commands;

public sealed record CreateMuhaqqiqCommand(
    string Name, string? Slug, string? Bio, IReadOnlyList<string>? Specialties, bool IsFeatured, int DisplayOrder)
    : ICommand<AdminMuhaqqiqDto>, IAuditableCommand
{
    public string AuditEntityType => "Muhaqqiq";
    public string? AuditEntityId => Slug ?? Name;
}

public sealed record UpdateMuhaqqiqCommand(
    int MuhaqqiqId, string Name, string? Bio, IReadOnlyList<string>? Specialties, bool IsFeatured, int DisplayOrder)
    : ICommand<AdminMuhaqqiqDto>, IAuditableCommand
{
    public string AuditEntityType => "Muhaqqiq";
    public string? AuditEntityId => MuhaqqiqId.ToString();
}

public sealed record SetMuhaqqiqActiveCommand(int MuhaqqiqId, bool IsActive) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "Muhaqqiq";
    public string? AuditEntityId => MuhaqqiqId.ToString();
}

public sealed record DeleteMuhaqqiqCommand(int MuhaqqiqId) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "Muhaqqiq";
    public string? AuditEntityId => MuhaqqiqId.ToString();
}

public sealed class CreateMuhaqqiqCommandValidator : AbstractValidator<CreateMuhaqqiqCommand>
{
    public CreateMuhaqqiqCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(Muhaqqiq.MaxNameLength);
        RuleFor(x => x.Slug).MaximumLength(Domain.Books.Slug.MaxLength);
        RuleFor(x => x.Bio).MaximumLength(Muhaqqiq.MaxBioLength);
        RuleFor(x => x.Specialties!.Count).LessThanOrEqualTo(Muhaqqiq.MaxSpecialties).When(x => x.Specialties is not null);
        RuleForEach(x => x.Specialties).MaximumLength(Muhaqqiq.MaxSpecialtyLength);
        RuleFor(x => x.DisplayOrder).InclusiveBetween(0, 10_000);
    }
}

public sealed class UpdateMuhaqqiqCommandValidator : AbstractValidator<UpdateMuhaqqiqCommand>
{
    public UpdateMuhaqqiqCommandValidator()
    {
        RuleFor(x => x.MuhaqqiqId).GreaterThan(0);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(Muhaqqiq.MaxNameLength);
        RuleFor(x => x.Bio).MaximumLength(Muhaqqiq.MaxBioLength);
        RuleFor(x => x.Specialties!.Count).LessThanOrEqualTo(Muhaqqiq.MaxSpecialties).When(x => x.Specialties is not null);
        RuleForEach(x => x.Specialties).MaximumLength(Muhaqqiq.MaxSpecialtyLength);
        RuleFor(x => x.DisplayOrder).InclusiveBetween(0, 10_000);
    }
}

public sealed class CreateMuhaqqiqCommandHandler(IMuhaqqiqRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<CreateMuhaqqiqCommand, AdminMuhaqqiqDto>
{
    public async Task<Result<AdminMuhaqqiqDto>> Handle(CreateMuhaqqiqCommand command, CancellationToken ct)
    {
        Slug slug;
        try
        {
            slug = Slug.Create(string.IsNullOrWhiteSpace(command.Slug) ? command.Name : command.Slug);
        }
        catch (ArgumentException)
        {
            return Result.Failure<AdminMuhaqqiqDto>(CatalogErrors.InvalidSlug);
        }

        if (await repository.SlugExistsAsync(slug.Value, ct))
            return Result.Failure<AdminMuhaqqiqDto>(CatalogErrors.DuplicateMuhaqqiqSlug(slug.Value));

        var muhaqqiq = Muhaqqiq.Create(
            command.Name, slug, command.Bio, command.Specialties ?? [], command.IsFeatured, command.DisplayOrder);

        repository.Add(muhaqqiq);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(muhaqqiq.ToAdminDto(worksCount: 0));
    }
}

public sealed class UpdateMuhaqqiqCommandHandler(
    IMuhaqqiqRepository repository, ICatalogQueries catalogQueries, IUnitOfWork unitOfWork)
    : ICommandHandler<UpdateMuhaqqiqCommand, AdminMuhaqqiqDto>
{
    public async Task<Result<AdminMuhaqqiqDto>> Handle(UpdateMuhaqqiqCommand command, CancellationToken ct)
    {
        var muhaqqiq = await repository.GetByIdAsync(command.MuhaqqiqId, ct);
        if (muhaqqiq is null)
            return Result.Failure<AdminMuhaqqiqDto>(CatalogErrors.MuhaqqiqNotFound(command.MuhaqqiqId));

        muhaqqiq.Update(command.Name, command.Bio, command.Specialties ?? [], command.IsFeatured, command.DisplayOrder);
        await unitOfWork.SaveChangesAsync(ct);

        var counts = await catalogQueries.CountBooksPerMuhaqqiqAsync(activeBooksOnly: false, ct);
        return Result.Success(muhaqqiq.ToAdminDto(counts.GetValueOrDefault(muhaqqiq.Id)));
    }
}

public sealed class SetMuhaqqiqActiveCommandHandler(IMuhaqqiqRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetMuhaqqiqActiveCommand>
{
    public async Task<Result> Handle(SetMuhaqqiqActiveCommand command, CancellationToken ct)
    {
        var muhaqqiq = await repository.GetByIdAsync(command.MuhaqqiqId, ct);
        if (muhaqqiq is null)
            return Result.Failure(CatalogErrors.MuhaqqiqNotFound(command.MuhaqqiqId));

        if (command.IsActive) muhaqqiq.Activate();
        else muhaqqiq.Deactivate();

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed class DeleteMuhaqqiqCommandHandler(
    IMuhaqqiqRepository repository, ICatalogQueries catalogQueries, IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteMuhaqqiqCommand>
{
    public async Task<Result> Handle(DeleteMuhaqqiqCommand command, CancellationToken ct)
    {
        var muhaqqiq = await repository.GetByIdAsync(command.MuhaqqiqId, ct);
        if (muhaqqiq is null)
            return Result.Failure(CatalogErrors.MuhaqqiqNotFound(command.MuhaqqiqId));

        var counts = await catalogQueries.CountBooksPerMuhaqqiqAsync(activeBooksOnly: false, ct);
        var bookCount = counts.GetValueOrDefault(muhaqqiq.Id);
        if (bookCount > 0)
            return Result.Failure(CatalogErrors.MuhaqqiqInUse(bookCount));

        repository.Remove(muhaqqiq);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}