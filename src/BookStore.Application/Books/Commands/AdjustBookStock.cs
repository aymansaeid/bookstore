using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using FluentValidation;

namespace BookStore.Application.Books.Commands;

public sealed record AdjustBookStockCommand(int BookId, int NewStockQuantity) : ICommand<AdminBookDto>;

public sealed class AdjustBookStockCommandValidator : AbstractValidator<AdjustBookStockCommand>
{
    public AdjustBookStockCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.NewStockQuantity).GreaterThanOrEqualTo(0);
    }
}

public sealed class AdjustBookStockCommandHandler(
    IBookRepository bookRepository,
    IUnitOfWork unitOfWork,
    IFileStorage fileStorage)
    : ICommandHandler<AdjustBookStockCommand, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(AdjustBookStockCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure<AdminBookDto>(BookErrors.NotFound(command.BookId));

        if (command.NewStockQuantity < book.ReservedQuantity)
            return Result.Failure<AdminBookDto>(BookErrors.StockBelowReserved(book.ReservedQuantity));

        book.SetStockQuantity(command.NewStockQuantity);

        // If a guest reserved a copy between our load above and this save,
        // RowVersion no longer matches, so EF refuses to overwrite and the
        // admin gets a 409 "reload and try again" instead of silently
        // clobbering a live reservation. This is exactly what RowVersion
        // was kept on Book for.
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(book.ToAdminDto(fileStorage));
    }
}