using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;

namespace BookStore.Application.Books.Commands;

public sealed record SetBookActiveCommand(int BookId, bool IsActive) : ICommand;

public sealed class SetBookActiveCommandHandler(IBookRepository bookRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetBookActiveCommand>
{
    public async Task<Result> Handle(SetBookActiveCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure(BookErrors.NotFound(command.BookId));

        if (command.IsActive) book.Activate();
        else book.Deactivate();

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}