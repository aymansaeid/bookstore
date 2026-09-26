using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using FluentValidation;

namespace BookStore.Application.Inventory.Queries;

public sealed record GetStockHistoryQuery(int BookId, int Page = 1, int PageSize = 50) : IQuery<StockHistoryDto>;

public sealed class GetStockHistoryQueryValidator : AbstractValidator<GetStockHistoryQuery>
{
    public GetStockHistoryQueryValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 200);
    }
}

public sealed class GetStockHistoryQueryHandler(
    IBookRepository bookRepository, IStockMovementRepository stockMovementRepository)
    : IQueryHandler<GetStockHistoryQuery, StockHistoryDto>
{
    public async Task<Result<StockHistoryDto>> Handle(GetStockHistoryQuery query, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(query.BookId, ct);
        if (book is null)
            return Result.Failure<StockHistoryDto>(InventoryErrors.BookNotFound(query.BookId));

        var page = await stockMovementRepository.ListByBookAsync(book.Id, query.Page, query.PageSize, ct);
        var ledgerTotal = await stockMovementRepository.SumByBookAsync(book.Id, ct);

        var movements = new PagedResult<StockMovementDto>(
            page.Items.Select(m => m.ToDto()).ToList(), page.Page, page.PageSize, page.TotalCount);

        return Result.Success(new StockHistoryDto(
            book.Id, book.Title, book.StockQuantity, ledgerTotal, ledgerTotal == book.StockQuantity, movements));
    }
}

public sealed record GetStockReconciliationQuery : IQuery<IReadOnlyList<ReconciliationRowDto>>;

public sealed class GetStockReconciliationQueryHandler(
    IBookRepository bookRepository, IStockMovementRepository stockMovementRepository)
    : IQueryHandler<GetStockReconciliationQuery, IReadOnlyList<ReconciliationRowDto>>
{
    public async Task<Result<IReadOnlyList<ReconciliationRowDto>>> Handle(
        GetStockReconciliationQuery query, CancellationToken ct)
    {
        var books = await bookRepository.ListAsync(includeInactive: true, ct);
        var totals = await stockMovementRepository.SumAllByBookAsync(ct);

        // Drift = stock that exists (or vanished) with no ledger entry
        // explaining it. Anything non-zero is worth investigating.
        var rows = books
            .Select(b =>
            {
                var ledger = totals.GetValueOrDefault(b.Id);
                var drift = b.StockQuantity - ledger;
                return new ReconciliationRowDto(b.Id, b.Title, b.StockQuantity, ledger, drift, drift == 0);
            })
            .OrderBy(r => r.IsBalanced)
            .ThenBy(r => r.Title)
            .ToList();

        return Result.Success<IReadOnlyList<ReconciliationRowDto>>(rows);
    }
}