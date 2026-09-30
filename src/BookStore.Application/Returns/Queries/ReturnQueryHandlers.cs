using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Orders;
using BookStore.Domain.Returns;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Returns.Queries;

public sealed record GetReturnEligibilityQuery(string OrderNumber, string Email) : IQuery<ReturnEligibilityDto>;

public sealed class GetReturnEligibilityQueryHandler(
    IOrderRepository orderRepository,
    IReturnRequestRepository returnRepository,
    IOptions<ReturnOptions> returnOptions)
    : IQueryHandler<GetReturnEligibilityQuery, ReturnEligibilityDto>
{
    public async Task<Result<ReturnEligibilityDto>> Handle(GetReturnEligibilityQuery query, CancellationToken ct)
    {
        var order = await ReturnLookup.FindOrderAsync(orderRepository, query.OrderNumber, query.Email, ct);
        if (order is null)
            return Result.Failure<ReturnEligibilityDto>(OrderErrors.TrackingNotFound);

        var lines = order.Lines
            .Select(l => new ReturnableLineDto(l.BookId, l.BookTitleSnapshot, l.Quantity))
            .ToList();

        var options = returnOptions.Value;
        var deadline = ReturnPolicy.GetDeadline(order, options.WindowDays, options.TransitAllowanceDays);

        if (deadline is null)
            return Result.Success(new ReturnEligibilityDto(false, "NotReturnable", null, lines));
        if (DateTimeOffset.UtcNow > deadline)
            return Result.Success(new ReturnEligibilityDto(false, "WindowClosed", deadline, lines));
        if (await returnRepository.GetBlockingForOrderAsync(order.Id, ct) is not null)
            return Result.Success(new ReturnEligibilityDto(false, "AlreadyRequested", deadline, lines));

        return Result.Success(new ReturnEligibilityDto(true, null, deadline, lines));
    }
}

public sealed record GetReturnStatusQuery(string OrderNumber, string Email) : IQuery<PublicReturnDto>;

public sealed class GetReturnStatusQueryHandler(
    IOrderRepository orderRepository, IReturnRequestRepository returnRepository)
    : IQueryHandler<GetReturnStatusQuery, PublicReturnDto>
{
    public async Task<Result<PublicReturnDto>> Handle(GetReturnStatusQuery query, CancellationToken ct)
    {
        var order = await ReturnLookup.FindOrderAsync(orderRepository, query.OrderNumber, query.Email, ct);
        if (order is null)
            return Result.Failure<PublicReturnDto>(OrderErrors.TrackingNotFound);

        var request = await returnRepository.GetLatestForOrderAsync(order.Id, ct);
        return request is null
            ? Result.Failure<PublicReturnDto>(ReturnErrors.NoReturnForOrder)
            : Result.Success(request.ToPublicDto());
    }
}

public sealed record ListReturnsQuery(ReturnStatus? Status, int Page = 1, int PageSize = 20)
    : IQuery<PagedResult<AdminReturnSummaryDto>>;

public sealed class ListReturnsQueryValidator : AbstractValidator<ListReturnsQuery>
{
    public ListReturnsQueryValidator()
    {
        RuleFor(x => x.Status).IsInEnum().When(x => x.Status.HasValue);
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
    }
}

public sealed class ListReturnsQueryHandler(IReturnQueries returnQueries)
    : IQueryHandler<ListReturnsQuery, PagedResult<AdminReturnSummaryDto>>
{
    public async Task<Result<PagedResult<AdminReturnSummaryDto>>> Handle(ListReturnsQuery query, CancellationToken ct) =>
        Result.Success(await returnQueries.ListAsync(query.Status, query.Page, query.PageSize, ct));
}

public sealed record GetAdminReturnQuery(int ReturnId) : IQuery<AdminReturnDto>;

public sealed class GetAdminReturnQueryHandler(IReturnRequestRepository returnRepository)
    : IQueryHandler<GetAdminReturnQuery, AdminReturnDto>
{
    public async Task<Result<AdminReturnDto>> Handle(GetAdminReturnQuery query, CancellationToken ct)
    {
        var request = await returnRepository.GetByIdAsync(query.ReturnId, ct);
        return request is null
            ? Result.Failure<AdminReturnDto>(ReturnErrors.NotFound(query.ReturnId))
            : Result.Success(request.ToAdminDto());
    }
}