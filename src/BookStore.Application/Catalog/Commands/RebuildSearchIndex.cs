using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;

namespace BookStore.Application.Catalog.Commands;

/// Recomputes the search text of every book. Run once after the migration,
/// and again only if the normalisation rules ever change.
public sealed record RebuildSearchIndexCommand : ICommand<int>, IAuditableCommand
{
    public string AuditEntityType => "Catalog";
    public string? AuditEntityId => null;
}

public sealed class RebuildSearchIndexCommandHandler(IBookRepository bookRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<RebuildSearchIndexCommand, int>
{
    public async Task<Result<int>> Handle(RebuildSearchIndexCommand command, CancellationToken ct)
    {
        // Untracked: each book is recomputed in memory and written with a
        // two-column update, never a tracked save.
        var books = await bookRepository.ListAsync(includeInactive: true, ct);

        foreach (var book in books)
        {
            book.RebuildSearchIndex();
            await bookRepository.SetSearchFieldsAsync(book.Id, book.SearchTitle, book.SearchText, ct);
        }

        // Nothing is tracked, but the audit row recorded by the pipeline only
        // persists on SaveChanges.
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(books.Count);
    }
}