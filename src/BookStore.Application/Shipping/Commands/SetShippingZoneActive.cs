using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;

namespace BookStore.Application.Shipping.Commands;

public sealed record SetShippingZoneActiveCommand(int ZoneId, bool IsActive) : ICommand;

public sealed class SetShippingZoneActiveCommandHandler(IShippingZoneRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetShippingZoneActiveCommand>
{
    public async Task<Result> Handle(SetShippingZoneActiveCommand command, CancellationToken ct)
    {
        var zone = await repository.GetByIdAsync(command.ZoneId, ct);
        if (zone is null)
            return Result.Failure(ShippingZoneErrors.NotFound(command.ZoneId));

        if (command.IsActive) zone.Activate();
        else zone.Deactivate();

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}