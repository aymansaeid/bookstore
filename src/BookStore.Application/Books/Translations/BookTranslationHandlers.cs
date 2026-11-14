using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using BookStore.Application.Translations;
using BookStore.Domain.Books;
using BookStore.Domain.Common;
using FluentValidation;

namespace BookStore.Application.Books.Translations;

public sealed record BookTranslationDto(
    string Language, string Title, string? Subtitle, string? Author, string? Description, string? EditionLabel,
    IReadOnlyList<string> Highlights, DateTimeOffset UpdatedAtUtc);

/// The Arabic source, shown next to the translation form.
public sealed record BookSourceTextDto(
    string Title, string? Subtitle, string Author, string Description, string? EditionLabel, IReadOnlyList<string> Highlights);

public sealed record AdminBookTranslationsDto(
    int BookId, string? TransliteratedTitle, BookSourceTextDto Source,
    IReadOnlyList<BookTranslationDto> Translations, IReadOnlyList<string> Missing);

internal static class BookTranslationMappings
{
    public static BookTranslationDto ToDto(this BookTranslation t) =>
        new(t.Language.Code(), t.Title, t.Subtitle, t.Author, t.Description, t.EditionLabel, t.Highlights.ToList(), t.UpdatedAtUtc);
}

// ---------- GET all ----------

public sealed record GetBookTranslationsQuery(int BookId) : IQuery<AdminBookTranslationsDto>;

public sealed class GetBookTranslationsQueryHandler(IBookRepository bookRepository)
    : IQueryHandler<GetBookTranslationsQuery, AdminBookTranslationsDto>
{
    public async Task<Result<AdminBookTranslationsDto>> Handle(GetBookTranslationsQuery query, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(query.BookId, ct);
        if (book is null)
            return Result.Failure<AdminBookTranslationsDto>(BookErrors.NotFound(query.BookId));

        return Result.Success(new AdminBookTranslationsDto(
            book.Id, book.TransliteratedTitle,
            new BookSourceTextDto(book.Title, book.Subtitle, book.Author, book.Description, book.EditionLabel, book.Highlights.ToList()),
            book.Translations.OrderBy(t => t.Language).Select(t => t.ToDto()).ToList(),
            TranslationLanguage.Missing(book.TranslatedLanguages)));
    }
}

// ---------- GET one ----------

public sealed record GetBookTranslationQuery(int BookId, string Language) : IQuery<BookTranslationDto>;

public sealed class GetBookTranslationQueryHandler(IBookRepository bookRepository)
    : IQueryHandler<GetBookTranslationQuery, BookTranslationDto>
{
    public async Task<Result<BookTranslationDto>> Handle(GetBookTranslationQuery query, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(query.Language);
        if (language.IsFailure)
            return Result.Failure<BookTranslationDto>(language.Error);

        var book = await bookRepository.GetByIdAsync(query.BookId, ct);
        if (book is null)
            return Result.Failure<BookTranslationDto>(BookErrors.NotFound(query.BookId));

        var translation = book.TranslationFor(language.Value);
        return translation is null
            ? Result.Failure<BookTranslationDto>(TranslationErrors.NotFound("Book", book.Id, language.Value.Code()))
            : Result.Success(translation.ToDto());
    }
}

// ---------- PUT ----------

public sealed record SetBookTranslationCommand(
    int BookId, string Language, string Title, string? Subtitle, string? Author, string? Description,
    string? EditionLabel, IReadOnlyList<string>? Highlights) : ICommand<BookTranslationDto>, IAuditableCommand
{
    public string AuditEntityType => "BookTranslation";
    public string? AuditEntityId => $"{BookId}/{Language}";
    object IAuditableCommand.AuditDetails => new { BookId, Language, Title };
}

public sealed class SetBookTranslationCommandValidator : AbstractValidator<SetBookTranslationCommand>
{
    public SetBookTranslationCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.Language).NotEmpty().MaximumLength(10);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(BookTranslation.MaxTitleLength);
        RuleFor(x => x.Subtitle).MaximumLength(BookTranslation.MaxSubtitleLength);
        RuleFor(x => x.Author).MaximumLength(BookTranslation.MaxAuthorLength);
        RuleFor(x => x.Description).MaximumLength(BookTranslation.MaxDescriptionLength);
        RuleFor(x => x.EditionLabel).MaximumLength(Book.MaxEditionLabelLength);
        RuleFor(x => x.Highlights!.Count).LessThanOrEqualTo(Book.MaxHighlights).When(x => x.Highlights is not null);
        RuleForEach(x => x.Highlights).MaximumLength(Book.MaxHighlightLength);
    }
}

public sealed class SetBookTranslationCommandHandler(IBookRepository bookRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetBookTranslationCommand, BookTranslationDto>
{
    public async Task<Result<BookTranslationDto>> Handle(SetBookTranslationCommand c, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(c.Language);
        if (language.IsFailure)
            return Result.Failure<BookTranslationDto>(language.Error);

        var book = await bookRepository.GetByIdAsync(c.BookId, ct);
        if (book is null)
            return Result.Failure<BookTranslationDto>(BookErrors.NotFound(c.BookId));

        try
        {
            book.SetTranslation(language.Value, new BookTranslationInput(
                c.Title, c.Subtitle, c.Author, c.Description, c.EditionLabel, c.Highlights));
        }
        catch (ArgumentException ex)
        {
            return Result.Failure<BookTranslationDto>(TranslationErrors.Invalid(ex.Message));
        }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(book.TranslationFor(language.Value)!.ToDto());
    }
}

// ---------- DELETE (idempotent) ----------

public sealed record DeleteBookTranslationCommand(int BookId, string Language) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "BookTranslation";
    public string? AuditEntityId => $"{BookId}/{Language}";
}

public sealed class DeleteBookTranslationCommandHandler(IBookRepository bookRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteBookTranslationCommand>
{
    public async Task<Result> Handle(DeleteBookTranslationCommand c, CancellationToken ct)
    {
        var language = TranslationLanguage.Parse(c.Language);
        if (language.IsFailure)
            return Result.Failure(language.Error);

        var book = await bookRepository.GetByIdAsync(c.BookId, ct);
        if (book is null)
            return Result.Failure(BookErrors.NotFound(c.BookId));

        if (book.RemoveTranslation(language.Value))
            await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}

// ---------- Transliterated title ----------

public sealed record SetBookTransliterationCommand(int BookId, string? TransliteratedTitle)
    : ICommand<AdminBookDto>, IAuditableCommand
{
    public string AuditEntityType => "Book";
    public string? AuditEntityId => BookId.ToString();
}

public sealed class SetBookTransliterationCommandValidator : AbstractValidator<SetBookTransliterationCommand>
{
    public SetBookTransliterationCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.TransliteratedTitle).MaximumLength(Book.MaxTransliteratedTitleLength);
    }
}

public sealed class SetBookTransliterationCommandHandler(
    IBookRepository bookRepository, IUnitOfWork unitOfWork, IFileStorage fileStorage)
    : ICommandHandler<SetBookTransliterationCommand, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(SetBookTransliterationCommand c, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(c.BookId, ct);
        if (book is null)
            return Result.Failure<AdminBookDto>(BookErrors.NotFound(c.BookId));

        book.SetTransliteratedTitle(c.TransliteratedTitle);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(book.ToAdminDto(fileStorage));
    }
}