using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Orders;
using FluentValidation;

namespace BookStore.Application.Orders.Commands;

public sealed record CancelOrderCommand(int OrderId, string Reason) : ICommand<AdminOrderDetailsDto>;

public sealed class CancelOrderCommandValidator : AbstractValidator<CancelOrderCommand>
{
    public CancelOrderCommandValidator()
    {
        RuleFor(x => x.OrderId).GreaterThan(0);
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}

public sealed class CancelOrderCommandHandler(
    IOrderRepository orderRepository,
    IBookRepository bookRepository,
    ICouponRepository couponRepository,
    IUnitOfWork unitOfWork)
    : ICommandHandler<CancelOrderCommand, AdminOrderDetailsDto>
{
    public async Task<Result<AdminOrderDetailsDto>> Handle(CancelOrderCommand command, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(command.OrderId, ct);
        if (order is null)
            return Result.Failure<AdminOrderDetailsDto>(OrderErrors.NotFound(command.OrderId));

        if (!order.CanBeCancelled)
            return Result.Failure<AdminOrderDetailsDto>(OrderErrors.InvalidStatus(order.Status, "cancel"));

        var wasPaid = order.Status == OrderStatus.Paid;

        // Status change + stock + coupon: all or nothing. If anything below
        // throws (including a RowVersion conflict on SaveChanges), the
        // transaction is disposed uncommitted and every write rolls back.
        await using var transaction = await unitOfWork.BeginTransactionAsync(ct);

        order.Cancel(command.Reason);

        foreach (var line in order.Lines)
        {
            if (wasPaid)
                // Sold but never shipped: the book is still on the shelf.
                await bookRepository.RestockAsync(line.BookId, line.Quantity, ct);
            else
                // Only reserved: just free the hold.
                await bookRepository.ReleaseReservationAsync(line.BookId, line.Quantity, ct);
        }

        if (order.AppliedCouponCode is not null)
            await couponRepository.ReleaseRedemptionAsync(order.AppliedCouponCode, ct);

        // TODO (payments step): if wasPaid, issue the Stripe refund here.
        // Until payments are integrated, no real paid orders can exist.

        await unitOfWork.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Result.Success(order.ToAdminDetailsDto());
    }
}