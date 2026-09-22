using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using FluentValidation;

namespace BookStore.Application.Orders.Commands;

public sealed record CorrectTrackingInfoCommand(int OrderId, string Carrier, string TrackingNumber)
    : ICommand<AdminOrderDetailsDto>;

public sealed class CorrectTrackingInfoCommandValidator : AbstractValidator<CorrectTrackingInfoCommand>
{
    public CorrectTrackingInfoCommandValidator()
    {
        RuleFor(x => x.OrderId).GreaterThan(0);
        RuleFor(x => x.Carrier).NotEmpty().MaximumLength(100);
        RuleFor(x => x.TrackingNumber).NotEmpty().MaximumLength(100);
    }
}

public sealed class CorrectTrackingInfoCommandHandler(IOrderRepository orderRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<CorrectTrackingInfoCommand, AdminOrderDetailsDto>
{
    public async Task<Result<AdminOrderDetailsDto>> Handle(CorrectTrackingInfoCommand command, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(command.OrderId, ct);
        if (order is null)
            return Result.Failure<AdminOrderDetailsDto>(OrderErrors.NotFound(command.OrderId));

        if (!order.CanCorrectTracking)
            return Result.Failure<AdminOrderDetailsDto>(OrderErrors.InvalidStatus(order.Status, "correct tracking on"));

        order.CorrectTrackingInfo(command.Carrier, command.TrackingNumber);

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(order.ToAdminDetailsDto());
    }
}