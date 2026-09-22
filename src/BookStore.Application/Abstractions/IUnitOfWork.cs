namespace BookStore.Application.Abstractions;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);

    /// For operations where several writes must all land or none do (e.g.
    /// cancel an order AND put its stock back). Disposing without calling
    /// CommitAsync rolls everything back, so an early return or an
    /// exception can never leave half the work committed.
    Task<ITransaction> BeginTransactionAsync(CancellationToken ct = default);
}

public interface ITransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken ct = default);
}