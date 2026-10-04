using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using BookStore.Domain.Orders;
using FluentValidation;

namespace BookStore.Application.Orders.Commands;

/// Same credentials as tracking and returns: order number + email. Works
/// for guests and signed-in customers alike.
public sealed record CancelMyOrderCommand(
    string OrderNumber, string Email, CustomerCancelReason Reason, string? Comment) : ICommand<PublicOrderDto>;

public sealed class CancelMyOrderCommandValidator : AbstractValidator<CancelMyOrderCommand>
{
    public CancelMyOrderCommandValidator()
    {
        RuleFor(x => x.OrderNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
        RuleFor(x => x.Reason).IsInEnum();
        // Leaves room in the 500-character reason column for the prefix.
        RuleFor(x => x.Comment).MaximumLength(400);
    }
}

public sealed class CancelMyOrderCommandHandler(
    IOrderRepository orderRepository,
    IBookRepository bookRepository,
    IFileStorage fileStorage,
    OrderCancellation cancellation)
    : ICommandHandler<CancelMyOrderCommand, PublicOrderDto>
{
    public async Task<Result<PublicOrderDto>> Handle(CancelMyOrderCommand command, CancellationToken ct)
    {
        var order = await orderRepository.GetByOrderNumberAsync(command.OrderNumber.Trim().ToUpperInvariant(), ct);

        var emailMatches = order is not null
            && string.Equals(order.CustomerEmail, command.Email.Trim().ToLowerInvariant(), StringComparison.Ordinal);

        if (!emailMatches)
            return Result.Failure<PublicOrderDto>(OrderErrors.TrackingNotFound);

        // Tell the customer the useful thing: after shipping, it's a return.
        if (order!.Status is OrderStatus.Shipped or OrderStatus.Delivered)
            return Result.Failure<PublicOrderDto>(OrderErrors.AlreadyShipped);

        // Stored as "Customer: <reason>" so the admin order screen shows who
        // and why at a glance; the enum value keeps it countable later.
        var reason = string.IsNullOrWhiteSpace(command.Comment)
            ? $"Customer: {command.Reason}"
            : $"Customer: {command.Reason} — {command.Comment.Trim()}";

        var result = await cancellation.CancelAsync(order, reason, CancellationActor.Customer, ct);
        if (result.IsFailure)
            return Result.Failure<PublicOrderDto>(result.Error);

        var books = await bookRepository.ListByIdsAsync(order.Lines.Select(l => l.BookId).Distinct().ToList(), ct);
        return Result.Success(order.ToPublicDto(books.ToDictionary(b => b.Id), fileStorage));
    }
}