using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using FluentValidation;

namespace BookStore.Application.Orders.Commands;

public sealed record ShipOrderCommand(int OrderId, string Carrier, string TrackingNumber)
    : ICommand<AdminOrderDetailsDto>;

public sealed class ShipOrderCommandValidator : AbstractValidator<ShipOrderCommand>
{
    public ShipOrderCommandValidator()
    {
        RuleFor(x => x.OrderId).GreaterThan(0);
        RuleFor(x => x.Carrier).NotEmpty().MaximumLength(100);
        RuleFor(x => x.TrackingNumber).NotEmpty().MaximumLength(100);
    }
}

public sealed class ShipOrderCommandHandler(IOrderRepository orderRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<ShipOrderCommand, AdminOrderDetailsDto>
{
    public async Task<Result<AdminOrderDetailsDto>> Handle(ShipOrderCommand command, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(command.OrderId, ct);
        if (order is null)
            return Result.Failure<AdminOrderDetailsDto>(OrderErrors.NotFound(command.OrderId));

        if (!order.CanBeShipped)
            return Result.Failure<AdminOrderDetailsDto>(OrderErrors.InvalidStatus(order.Status, "ship"));

        // Raises OrderShippedDomainEvent -> the interceptor writes it to the
        // outbox in this same SaveChanges. The "your order shipped" email
        // gets sent from there once we build the outbox worker.
        order.Ship(command.Carrier, command.TrackingNumber);

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(order.ToAdminDetailsDto());
    }
}