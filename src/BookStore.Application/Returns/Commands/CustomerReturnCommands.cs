using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Orders;
using BookStore.Domain.Returns;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Returns.Commands;

public sealed record RequestReturnCommand(
    string OrderNumber, string Email, IReadOnlyCollection<ReturnItem> Items, ReturnReason Reason, string? Comment)
    : ICommand<PublicReturnDto>;

public sealed class RequestReturnCommandValidator : AbstractValidator<RequestReturnCommand>
{
    public RequestReturnCommandValidator()
    {
        RuleFor(x => x.OrderNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
        RuleFor(x => x.Items).NotEmpty();
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.BookId).GreaterThan(0);
            item.RuleFor(i => i.Quantity).GreaterThan(0);
        });
        RuleFor(x => x.Reason).IsInEnum();
        RuleFor(x => x.Comment).MaximumLength(ReturnRequest.MaxCommentLength);
    }
}

public sealed class RequestReturnCommandHandler(
    IOrderRepository orderRepository,
    IReturnRequestRepository returnRepository,
    IUnitOfWork unitOfWork,
    IOptions<ReturnOptions> returnOptions)
    : ICommandHandler<RequestReturnCommand, PublicReturnDto>
{
    public async Task<Result<PublicReturnDto>> Handle(RequestReturnCommand command, CancellationToken ct)
    {
        var order = await ReturnLookup.FindOrderAsync(orderRepository, command.OrderNumber, command.Email, ct);
        if (order is null)
            return Result.Failure<PublicReturnDto>(OrderErrors.TrackingNotFound);

        var options = returnOptions.Value;
        var deadline = ReturnPolicy.GetDeadline(order, options.WindowDays, options.TransitAllowanceDays);

        if (deadline is null)
            return Result.Failure<PublicReturnDto>(ReturnErrors.OrderNotReturnable(order.Status));
        if (DateTimeOffset.UtcNow > deadline)
            return Result.Failure<PublicReturnDto>(ReturnErrors.WindowClosed(deadline.Value));

        if (await returnRepository.GetBlockingForOrderAsync(order.Id, ct) is not null)
            return Result.Failure<PublicReturnDto>(ReturnErrors.AlreadyRequested);

        ReturnRequest request;
        try
        {
            request = ReturnRequest.Create(order, command.Items, command.Reason, command.Comment);
        }
        catch (ArgumentException ex)
        {
            // Quantity or book mismatches, phrased for the customer by the domain.
            return Result.Failure<PublicReturnDto>(ReturnErrors.InvalidItems(ex.Message));
        }

        returnRepository.Add(request);

        // Two racing requests: the filtered unique index turns the second
        // into a 409 via DuplicateEntryException.
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(request.ToPublicDto());
    }
}

public sealed record CancelReturnCommand(string OrderNumber, string Email) : ICommand<PublicReturnDto>;

public sealed class CancelReturnCommandHandler(
    IOrderRepository orderRepository,
    IReturnRequestRepository returnRepository,
    IUnitOfWork unitOfWork)
    : ICommandHandler<CancelReturnCommand, PublicReturnDto>
{
    public async Task<Result<PublicReturnDto>> Handle(CancelReturnCommand command, CancellationToken ct)
    {
        var order = await ReturnLookup.FindOrderAsync(orderRepository, command.OrderNumber, command.Email, ct);
        if (order is null)
            return Result.Failure<PublicReturnDto>(OrderErrors.TrackingNotFound);

        var request = await returnRepository.GetBlockingForOrderAsync(order.Id, ct);
        if (request is null)
            return Result.Failure<PublicReturnDto>(ReturnErrors.NoReturnForOrder);

        if (!request.CanBeCancelledByCustomer)
            return Result.Failure<PublicReturnDto>(ReturnErrors.InvalidStatus(request.Status, "cancel"));

        request.CancelByCustomer();
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(request.ToPublicDto());
    }
}