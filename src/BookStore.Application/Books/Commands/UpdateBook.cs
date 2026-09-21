using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Common;
using FluentValidation;

namespace BookStore.Application.Books.Commands;

public sealed record UpdateBookCommand(
    int BookId,
    string Title,
    string Author,
    string? Isbn,
    string? Description,
    decimal Price) : ICommand<AdminBookDto>;

public sealed class UpdateBookCommandValidator : AbstractValidator<UpdateBookCommand>
{
    public UpdateBookCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Author).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Isbn).MaximumLength(20);
        RuleFor(x => x.Description).MaximumLength(4000);
        RuleFor(x => x.Price).GreaterThan(0).PrecisionScale(18, 2, ignoreTrailingZeros: true);
    }
}

public sealed class UpdateBookCommandHandler(IBookRepository bookRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<UpdateBookCommand, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(UpdateBookCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure<AdminBookDto>(BookErrors.NotFound(command.BookId));

        var isbn = command.Isbn?.Trim() ?? string.Empty;
        if (isbn.Length > 0 && await bookRepository.IsbnExistsAsync(isbn, excludeBookId: book.Id, ct))
            return Result.Failure<AdminBookDto>(BookErrors.DuplicateIsbn(isbn));

        book.UpdateDetails(command.Title, command.Author, isbn, command.Description ?? string.Empty);

        // Currency stays whatever the book already uses (single-currency
        // store). Changing the price here never touches past orders, since
        // each OrderLine snapshotted its own UnitPriceAtPurchase.
        book.UpdatePrice(Money.From(command.Price, book.Price.Currency));

        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(book.ToAdminDto());
    }
}