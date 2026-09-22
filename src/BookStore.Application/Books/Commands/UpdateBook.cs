using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using BookStore.Domain.Books;
using BookStore.Domain.Common;
using FluentValidation;

namespace BookStore.Application.Books.Commands;

public sealed record UpdateBookCommand(
    int BookId,
    string Title,
    string? Subtitle,
    string Author,
    string? Description,
    BookFormat Format,
    int PageCount,
    string Language,
    string? Publisher,
    DateOnly? PublicationDate,
    int WeightGrams,
    int HeightMm,
    int WidthMm,
    int DepthMm,
    decimal Price) : ICommand<AdminBookDto>;

public sealed class UpdateBookCommandValidator : AbstractValidator<UpdateBookCommand>
{
    public UpdateBookCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Subtitle).MaximumLength(500);
        RuleFor(x => x.Author).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Description).MaximumLength(4000);
        RuleFor(x => x.Format).IsInEnum();
        RuleFor(x => x.PageCount).InclusiveBetween(1, 50_000);
        RuleFor(x => x.Language).NotEmpty().Length(2);
        RuleFor(x => x.Publisher).MaximumLength(300);
        RuleFor(x => x.WeightGrams).InclusiveBetween(1, 50_000);
        RuleFor(x => x.HeightMm).InclusiveBetween(1, 2_000);
        RuleFor(x => x.WidthMm).InclusiveBetween(1, 2_000);
        RuleFor(x => x.DepthMm).InclusiveBetween(1, 1_000);
        RuleFor(x => x.Price).GreaterThan(0).PrecisionScale(18, 2, ignoreTrailingZeros: true);
    }
}

public sealed class UpdateBookCommandHandler(
    IBookRepository bookRepository,
    IUnitOfWork unitOfWork,
    IFileStorage fileStorage)
    : ICommandHandler<UpdateBookCommand, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(UpdateBookCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure<AdminBookDto>(BookErrors.NotFound(command.BookId));

        book.UpdateDetails(
            command.Title, command.Subtitle, command.Author, command.Description ?? string.Empty,
            command.Format, command.PageCount, command.Language, command.Publisher, command.PublicationDate,
            BookDimensions.Create(command.WeightGrams, command.HeightMm, command.WidthMm, command.DepthMm));

        book.UpdatePrice(Money.From(command.Price, book.Price.Currency));

        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(book.ToAdminDto(fileStorage));
    }
}