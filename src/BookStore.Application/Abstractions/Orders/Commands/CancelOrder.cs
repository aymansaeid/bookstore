using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Inventory;
using BookStore.Domain.Orders;
using FluentValidation;

namespace BookStore.Application.Orders.Commands;

public sealed record CancelOrderCommand(int OrderId, string Reason) : ICommand<AdminOrderDetailsDto>, IAuditableCommand
{
    public string AuditEntityType => "Order";
    public string? AuditEntityId => OrderId.ToString();
}

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
    IStockMovementRepository stockMovementRepository,
    ICurrentActor currentActor,
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

        await using var transaction = await unitOfWork.BeginTransactionAsync(ct);

        order.Cancel(command.Reason);

        foreach (var line in order.Lines)
        {
            if (wasPaid)
            {
                await bookRepository.RestockAsync(line.BookId, line.Quantity, ct);
                stockMovementRepository.Add(StockMovement.Create(
                    line.BookId, line.Quantity, StockMovementReason.CancellationRestock,
                    $"Order {order.OrderNumber} cancelled before shipping",
                    orderId: order.Id, adminUserId: currentActor.AdminUserId));
            }
            else
            {
                // Only a reservation was released; physical stock never moved,
                // so there's nothing to record in the ledger.
                await bookRepository.ReleaseReservationAsync(line.BookId, line.Quantity, ct);
            }
        }

        if (order.AppliedCouponCode is not null)
            await couponRepository.ReleaseRedemptionAsync(order.AppliedCouponCode, ct);

        await unitOfWork.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Result.Success(order.ToAdminDetailsDto());
    }
}