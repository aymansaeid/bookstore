using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using FluentValidation;

namespace BookStore.Application.Books.Commands;

public sealed record SetBookActivityCommand(int BookId, bool IsActive) : ICommand<AdminBookDto>;

public sealed class SetBookActivityCommandValidator : AbstractValidator<SetBookActivityCommand>
{
    public SetBookActivityCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
    }
}

public sealed class SetBookActivityCommandHandler(
    IBookRepository bookRepository,
    IUnitOfWork unitOfWork,
    IFileStorage fileStorage)
    : ICommandHandler<SetBookActivityCommand, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(SetBookActivityCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        
        if (book is null)
            return Result.Failure<AdminBookDto>(BookErrors.NotFound(command.BookId));

        if (command.IsActive)
        {
            book.Activate();
        }
        else
        {
            book.Deactivate();
        }

        // A concurrent reservation is fine here: that customer keeps their held
        // copy, and the book simply stops being offered to new buyers.
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(book.ToAdminDto(fileStorage));
    }
}