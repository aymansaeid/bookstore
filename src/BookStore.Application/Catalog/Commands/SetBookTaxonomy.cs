using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Catalog;
using BookStore.Application.Common;
using BookStore.Domain.Books;
using FluentValidation;

namespace BookStore.Application.Books.Commands;

public sealed record SetBookTaxonomyCommand(int BookId, int? CategoryId, IReadOnlyList<int> MuhaqqiqIds)
    : ICommand<AdminBookDto>, IAuditableCommand
{
    public string AuditEntityType => "Book";
    public string? AuditEntityId => BookId.ToString();
}

public sealed class SetBookTaxonomyCommandValidator : AbstractValidator<SetBookTaxonomyCommand>
{
    public SetBookTaxonomyCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue);
        RuleFor(x => x.MuhaqqiqIds).NotNull();
        RuleFor(x => x.MuhaqqiqIds.Count).LessThanOrEqualTo(Book.MaxMuhaqqiqs);
        RuleFor(x => x.MuhaqqiqIds)
            .Must(ids => ids.Distinct().Count() == ids.Count)
            .WithMessage("Each muhaqqiq can be credited only once.");
    }
}

public sealed class SetBookTaxonomyCommandHandler(
    IBookRepository bookRepository,
    ICategoryRepository categoryRepository,
    IMuhaqqiqRepository muhaqqiqRepository,
    IUnitOfWork unitOfWork,
    IFileStorage fileStorage)
    : ICommandHandler<SetBookTaxonomyCommand, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(SetBookTaxonomyCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure<AdminBookDto>(BookErrors.NotFound(command.BookId));

        if (command.CategoryId is { } categoryId && await categoryRepository.GetByIdAsync(categoryId, ct) is null)
            return Result.Failure<AdminBookDto>(CatalogErrors.CategoryNotFound(categoryId));

        if (command.MuhaqqiqIds.Count > 0)
        {
            var found = await muhaqqiqRepository.ListByIdsAsync(command.MuhaqqiqIds, ct);
            var missing = command.MuhaqqiqIds.Except(found.Select(m => m.Id)).ToList();

            if (missing.Count > 0)
                return Result.Failure<AdminBookDto>(CatalogErrors.UnknownMuhaqqiqs(missing));
        }

        book.SetTaxonomy(command.CategoryId, command.MuhaqqiqIds);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(book.ToAdminDto(fileStorage));
    }
}