using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using FluentValidation;

namespace BookStore.Application.Orders.Commands;

public sealed record CancelOrderCommand(int OrderId, string Reason)
    : ICommand<AdminOrderDetailsDto>, IAuditableCommand
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
    OrderCancellation cancellation,
    ICurrentActor currentActor)
    : ICommandHandler<CancelOrderCommand, AdminOrderDetailsDto>
{
    public async Task<Result<AdminOrderDetailsDto>> Handle(CancelOrderCommand command, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(command.OrderId, ct);
        if (order is null)
            return Result.Failure<AdminOrderDetailsDto>(OrderErrors.NotFound(command.OrderId));

        var result = await cancellation.CancelAsync(
            order, command.Reason, CancellationActor.Admin(currentActor.AdminUserId), ct);

        return result.IsSuccess
            ? Result.Success(order.ToAdminDetailsDto())
            : Result.Failure<AdminOrderDetailsDto>(result.Error);
    }
}