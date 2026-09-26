using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using BookStore.Domain.Inventory;
using FluentValidation;

namespace BookStore.Application.Books.Commands;

public sealed record AdjustBookStockCommand(int BookId, int NewStockQuantity, string Note)
    : ICommand<AdminBookDto>, IAuditableCommand
{
    public string AuditEntityType => "Book";
    public string? AuditEntityId => BookId.ToString();
}

public sealed class AdjustBookStockCommandValidator : AbstractValidator<AdjustBookStockCommand>
{
    public AdjustBookStockCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.NewStockQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Note)
            .NotEmpty().WithMessage("Say why stock is changing (e.g. 'Warehouse count', '2 damaged in transit').")
            .MaximumLength(500);
    }
}

public sealed class AdjustBookStockCommandHandler(
    IBookRepository bookRepository,
    IStockMovementRepository stockMovementRepository,
    ICurrentActor currentActor,
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

        var delta = command.NewStockQuantity - book.StockQuantity;

        // Setting stock to what it already is: nothing to change, nothing
        // to record in the ledger.
        if (delta == 0)
            return Result.Success(book.ToAdminDto(fileStorage));

        book.SetStockQuantity(command.NewStockQuantity);

        // Same SaveChanges as the stock change: the ledger row can never
        // exist without the change, or the change without its ledger row.
        stockMovementRepository.Add(StockMovement.Create(
            book.Id, delta, StockMovementReason.ManualAdjustment, command.Note,
            adminUserId: currentActor.AdminUserId));

        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(book.ToAdminDto(fileStorage));
    }
}