using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Payments.Queries;

public sealed record GetDueCheckoutOrderIdsQuery : IQuery<IReadOnlyList<int>>;

public sealed class GetDueCheckoutOrderIdsQueryHandler(
    IOrderRepository orderRepository,
    IOptions<CheckoutSweepOptions> sweepOptions)
    : IQueryHandler<GetDueCheckoutOrderIdsQuery, IReadOnlyList<int>>
{
    public async Task<Result<IReadOnlyList<int>>> Handle(GetDueCheckoutOrderIdsQuery query, CancellationToken ct)
    {
        var options = sweepOptions.Value;
        var cutoff = DateTimeOffset.UtcNow.AddMinutes(-options.GracePeriodMinutes);

        return Result.Success(await orderRepository.ListDueForExpiryAsync(cutoff, options.BatchSize, ct));
    }
}