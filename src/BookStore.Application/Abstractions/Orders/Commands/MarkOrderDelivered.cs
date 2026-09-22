using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;

namespace BookStore.Application.Orders.Commands;

public sealed record MarkOrderDeliveredCommand(int OrderId) : ICommand<AdminOrderDetailsDto>;

public sealed class MarkOrderDeliveredCommandHandler(IOrderRepository orderRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<MarkOrderDeliveredCommand, AdminOrderDetailsDto>
{
    public async Task<Result<AdminOrderDetailsDto>> Handle(MarkOrderDeliveredCommand command, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(command.OrderId, ct);
        if (order is null)
            return Result.Failure<AdminOrderDetailsDto>(OrderErrors.NotFound(command.OrderId));

        if (!order.CanBeDelivered)
            return Result.Failure<AdminOrderDetailsDto>(OrderErrors.InvalidStatus(order.Status, "mark as delivered"));

        order.Deliver();

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(order.ToAdminDetailsDto());
    }
}