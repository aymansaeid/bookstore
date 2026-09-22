using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using BookStore.Domain.Books;
using BookStore.Domain.Common;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Books.Commands;

public sealed record CreateBookCommand(
    string Title,
    string? Subtitle,
    string Author,
    string? Slug,
    string? Isbn,
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
    decimal Price,
    int InitialStock) : ICommand<AdminBookDto>;

public sealed class CreateBookCommandValidator : AbstractValidator<CreateBookCommand>
{
    public CreateBookCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Subtitle).MaximumLength(500);
        RuleFor(x => x.Author).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Slug).MaximumLength(200);
        RuleFor(x => x.Isbn).MaximumLength(20);
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
        RuleFor(x => x.InitialStock).GreaterThanOrEqualTo(0);
    }
}

public sealed class CreateBookCommandHandler(
    IBookRepository bookRepository,
    IUnitOfWork unitOfWork,
    IFileStorage fileStorage,
    IOptions<StoreOptions> storeOptions)
    : ICommandHandler<CreateBookCommand, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(CreateBookCommand command, CancellationToken ct)
    {
        var isbn = command.Isbn?.Trim() ?? string.Empty;

        if (isbn.Length > 0 && await bookRepository.IsbnExistsAsync(isbn, excludeBookId: null, ct))
            return Result.Failure<AdminBookDto>(BookErrors.DuplicateIsbn(isbn));

        // Falls back to the title when no slug is given. Either way it goes
        // through the same normalization, so "My Book!" and "my-book" both
        // land on "my-book".
        Slug slug;
        try
        {
            slug = Slug.Create(string.IsNullOrWhiteSpace(command.Slug) ? command.Title : command.Slug);
        }
        catch (ArgumentException)
        {
            return Result.Failure<AdminBookDto>(
                Error.Validation("Book.InvalidSlug", "The title or slug contains no usable URL characters."));
        }

        if (await bookRepository.SlugExistsAsync(slug.Value, ct))
            return Result.Failure<AdminBookDto>(BookErrors.DuplicateSlug(slug.Value));

        var book = Book.Create(
            command.Title, command.Subtitle, command.Author, slug, isbn,
            command.Description ?? string.Empty,
            command.Format, command.PageCount, command.Language, command.Publisher, command.PublicationDate,
            BookDimensions.Create(command.WeightGrams, command.HeightMm, command.WidthMm, command.DepthMm),
            Money.From(command.Price, storeOptions.Value.Currency),
            command.InitialStock);

        bookRepository.Add(book);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(book.ToAdminDto(fileStorage));
    }
}