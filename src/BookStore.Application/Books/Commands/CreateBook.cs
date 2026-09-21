using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Books;
using BookStore.Domain.Common;
using FluentValidation;

namespace BookStore.Application.Books.Commands;

public sealed record CreateBookCommand(
    string Title,
    string Author,
    string? Isbn,
    string? Description,
    decimal Price,
    string Currency,
    int InitialStock) : ICommand<AdminBookDto>;

public sealed class CreateBookCommandValidator : AbstractValidator<CreateBookCommand>
{
    public CreateBookCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Author).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Isbn).MaximumLength(20);
        RuleFor(x => x.Description).MaximumLength(4000);
        RuleFor(x => x.Price).GreaterThan(0).PrecisionScale(18, 2, ignoreTrailingZeros: true);
        RuleFor(x => x.Currency).NotEmpty().Length(3);
        RuleFor(x => x.InitialStock).GreaterThanOrEqualTo(0);
    }
}

public sealed class CreateBookCommandHandler(IBookRepository bookRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<CreateBookCommand, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(CreateBookCommand command, CancellationToken ct)
    {
        var isbn = command.Isbn?.Trim() ?? string.Empty;

        if (isbn.Length > 0 && await bookRepository.IsbnExistsAsync(isbn, excludeBookId: null, ct))
            return Result.Failure<AdminBookDto>(BookErrors.DuplicateIsbn(isbn));

        var book = Book.Create(
            command.Title.Trim(),
            command.Author.Trim(),
            isbn,
            command.Description?.Trim() ?? string.Empty,
            Money.From(command.Price, command.Currency),
            command.InitialStock);

        bookRepository.Add(book);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(book.ToAdminDto());
    }
}