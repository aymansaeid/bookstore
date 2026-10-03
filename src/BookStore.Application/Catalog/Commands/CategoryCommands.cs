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

public sealed record CreateCategoryCommand(
    string Name, string? Slug, string? Letter, string? Description, int? ParentId, int DisplayOrder)
    : ICommand<AdminCategoryDto>, IAuditableCommand
{
    public string AuditEntityType => "Category";
    public string? AuditEntityId => Slug ?? Name;
}

public sealed record UpdateCategoryCommand(
    int CategoryId, string Name, string? Letter, string? Description, int? ParentId, int DisplayOrder)
    : ICommand<AdminCategoryDto>, IAuditableCommand
{
    public string AuditEntityType => "Category";
    public string? AuditEntityId => CategoryId.ToString();
}

public sealed record SetCategoryActiveCommand(int CategoryId, bool IsActive) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "Category";
    public string? AuditEntityId => CategoryId.ToString();
}

public sealed record DeleteCategoryCommand(int CategoryId) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "Category";
    public string? AuditEntityId => CategoryId.ToString();
}

public sealed class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(Category.MaxNameLength);
        RuleFor(x => x.Slug).MaximumLength(Domain.Books.Slug.MaxLength);
        RuleFor(x => x.Letter).MaximumLength(8);
        RuleFor(x => x.Description).MaximumLength(Category.MaxDescriptionLength);
        RuleFor(x => x.ParentId).GreaterThan(0).When(x => x.ParentId.HasValue);
        RuleFor(x => x.DisplayOrder).InclusiveBetween(0, 10_000);
    }
}

public sealed class UpdateCategoryCommandValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryCommandValidator()
    {
        RuleFor(x => x.CategoryId).GreaterThan(0);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(Category.MaxNameLength);
        RuleFor(x => x.Letter).MaximumLength(8);
        RuleFor(x => x.Description).MaximumLength(Category.MaxDescriptionLength);
        RuleFor(x => x.ParentId).GreaterThan(0).When(x => x.ParentId.HasValue);
        RuleFor(x => x.DisplayOrder).InclusiveBetween(0, 10_000);
    }
}

public sealed class CreateCategoryCommandHandler(ICategoryRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<CreateCategoryCommand, AdminCategoryDto>
{
    public async Task<Result<AdminCategoryDto>> Handle(CreateCategoryCommand command, CancellationToken ct)
    {
        Slug slug;
        try
        {
            slug = Slug.Create(string.IsNullOrWhiteSpace(command.Slug) ? command.Name : command.Slug);
        }
        catch (ArgumentException)
        {
            return Result.Failure<AdminCategoryDto>(CatalogErrors.InvalidSlug);
        }

        if (await repository.SlugExistsAsync(slug.Value, ct))
            return Result.Failure<AdminCategoryDto>(CatalogErrors.DuplicateCategorySlug(slug.Value));

        if (command.ParentId is { } parentId)
        {
            var parent = await repository.GetByIdAsync(parentId, ct);
            if (parent is null)
                return Result.Failure<AdminCategoryDto>(CatalogErrors.CategoryNotFound(parentId));
            if (!parent.IsTopLevel)
                return Result.Failure<AdminCategoryDto>(CatalogErrors.ParentMustBeTopLevel);
        }

        var category = Category.Create(
            command.Name, slug, command.Letter, command.Description, command.ParentId, command.DisplayOrder);

        repository.Add(category);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(category.ToAdminDto(bookCount: 0));
    }
}

public sealed class UpdateCategoryCommandHandler(
    ICategoryRepository repository, ICatalogQueries catalogQueries, IUnitOfWork unitOfWork)
    : ICommandHandler<UpdateCategoryCommand, AdminCategoryDto>
{
    public async Task<Result<AdminCategoryDto>> Handle(UpdateCategoryCommand command, CancellationToken ct)
    {
        var category = await repository.GetByIdAsync(command.CategoryId, ct);
        if (category is null)
            return Result.Failure<AdminCategoryDto>(CatalogErrors.CategoryNotFound(command.CategoryId));

        if (command.ParentId != category.ParentId)
        {
            if (command.ParentId is { } parentId)
            {
                if (parentId == category.Id)
                    return Result.Failure<AdminCategoryDto>(CatalogErrors.CannotBeOwnParent);

                var parent = await repository.GetByIdAsync(parentId, ct);
                if (parent is null)
                    return Result.Failure<AdminCategoryDto>(CatalogErrors.CategoryNotFound(parentId));
                if (!parent.IsTopLevel)
                    return Result.Failure<AdminCategoryDto>(CatalogErrors.ParentMustBeTopLevel);

                // Moving a parent under another category would create a
                // third level for its children.
                if (await repository.HasChildrenAsync(category.Id, ct))
                    return Result.Failure<AdminCategoryDto>(CatalogErrors.HasSubcategories);
            }

            category.MoveUnder(command.ParentId);
        }

        category.Update(command.Name, command.Letter, command.Description, command.DisplayOrder);
        await unitOfWork.SaveChangesAsync(ct);

        var counts = await catalogQueries.CountBooksPerCategoryAsync(activeBooksOnly: false, ct);
        return Result.Success(category.ToAdminDto(counts.GetValueOrDefault(category.Id)));
    }
}

public sealed class SetCategoryActiveCommandHandler(ICategoryRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetCategoryActiveCommand>
{
    public async Task<Result> Handle(SetCategoryActiveCommand command, CancellationToken ct)
    {
        var category = await repository.GetByIdAsync(command.CategoryId, ct);
        if (category is null)
            return Result.Failure(CatalogErrors.CategoryNotFound(command.CategoryId));

        if (command.IsActive) category.Activate();
        else category.Deactivate();

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed class DeleteCategoryCommandHandler(
    ICategoryRepository repository, ICatalogQueries catalogQueries, IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteCategoryCommand>
{
    public async Task<Result> Handle(DeleteCategoryCommand command, CancellationToken ct)
    {
        var category = await repository.GetByIdAsync(command.CategoryId, ct);
        if (category is null)
            return Result.Failure(CatalogErrors.CategoryNotFound(command.CategoryId));

        if (await repository.HasChildrenAsync(category.Id, ct))
            return Result.Failure(CatalogErrors.HasSubcategories);

        // Counts hidden books too: they still point at this category.
        var counts = await catalogQueries.CountBooksPerCategoryAsync(activeBooksOnly: false, ct);
        var bookCount = counts.GetValueOrDefault(category.Id);
        if (bookCount > 0)
            return Result.Failure(CatalogErrors.CategoryInUse(bookCount));

        repository.Remove(category);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}