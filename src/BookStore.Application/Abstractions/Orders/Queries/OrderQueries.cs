using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using BookStore.Domain.Orders;
using FluentValidation;

namespace BookStore.Application.Orders.Queries;

public sealed record ListOrdersQuery(OrderStatus? Status, string? Search, int Page = 1, int PageSize = 20)
    : IQuery<PagedResult<AdminOrderSummaryDto>>;

public sealed class ListOrdersQueryValidator : AbstractValidator<ListOrdersQuery>
{
    public ListOrdersQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        RuleFor(x => x.Search).MaximumLength(320);
        RuleFor(x => x.Status).IsInEnum().When(x => x.Status.HasValue);
    }
}

public sealed class ListOrdersQueryHandler(IOrderQueries orderQueries)
    : IQueryHandler<ListOrdersQuery, PagedResult<AdminOrderSummaryDto>>
{
    public async Task<Result<PagedResult<AdminOrderSummaryDto>>> Handle(ListOrdersQuery query, CancellationToken ct)
    {
        var page = await orderQueries.ListAsync(
            new OrderListFilter(query.Status, query.Search, query.Page, query.PageSize), ct);

        return Result.Success(page);
    }
}

public sealed record GetAdminOrderByIdQuery(int OrderId) : IQuery<AdminOrderDetailsDto>;

public sealed class GetAdminOrderByIdQueryHandler(IOrderRepository orderRepository)
    : IQueryHandler<GetAdminOrderByIdQuery, AdminOrderDetailsDto>
{
    public async Task<Result<AdminOrderDetailsDto>> Handle(GetAdminOrderByIdQuery query, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(query.OrderId, ct);
        return order is null
            ? Result.Failure<AdminOrderDetailsDto>(OrderErrors.NotFound(query.OrderId))
            : Result.Success(order.ToAdminDetailsDto());
    }
}

public sealed record TrackOrderQuery(string OrderNumber, string Email) : IQuery<PublicOrderDto>;

public sealed class TrackOrderQueryValidator : AbstractValidator<TrackOrderQuery>
{
    public TrackOrderQueryValidator()
    {
        RuleFor(x => x.OrderNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
    }
}

public sealed class TrackOrderQueryHandler(
    IOrderRepository orderRepository, IBookRepository bookRepository, IFileStorage fileStorage)
    : IQueryHandler<TrackOrderQuery, PublicOrderDto>
{
    public async Task<Result<PublicOrderDto>> Handle(TrackOrderQuery query, CancellationToken ct)
    {
        var order = await orderRepository.GetByOrderNumberAsync(query.OrderNumber.Trim().ToUpperInvariant(), ct);

        var emailMatches = order is not null
            && string.Equals(order.CustomerEmail, query.Email.Trim().ToLowerInvariant(), StringComparison.Ordinal);

        if (!emailMatches)
            return Result.Failure<PublicOrderDto>(OrderErrors.TrackingNotFound);

        var books = await bookRepository.ListByIdsAsync(order!.Lines.Select(l => l.BookId).Distinct().ToList(), ct);
        return Result.Success(order.ToPublicDto(books.ToDictionary(b => b.Id), fileStorage));
    }
}