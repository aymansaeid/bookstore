using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;

namespace BookStore.Application.Notifications.Queries;

public sealed record GetWaitingListCountQuery(int BookId) : IQuery<WaitingListCountDto>;

public sealed record WaitingListCountDto(int BookId, int WaitingCount);

/// Admin-only: tells you how many people are waiting before you decide
/// on a reprint.
public sealed class GetWaitingListCountQueryHandler(IStockNotificationRepository repository)
    : IQueryHandler<GetWaitingListCountQuery, WaitingListCountDto>
{
    public async Task<Result<WaitingListCountDto>> Handle(GetWaitingListCountQuery query, CancellationToken ct)
    {
        var count = await repository.CountAwaitingNotificationAsync(query.BookId, ct);
        return Result.Success(new WaitingListCountDto(query.BookId, count));
    }
}