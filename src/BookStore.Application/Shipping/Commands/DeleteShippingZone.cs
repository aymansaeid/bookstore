using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;

namespace BookStore.Application.Shipping.Commands;

public sealed record DeleteShippingZoneCommand(int ZoneId) : ICommand;

public sealed class DeleteShippingZoneCommandHandler(IShippingZoneRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteShippingZoneCommand>
{
    public async Task<Result> Handle(DeleteShippingZoneCommand command, CancellationToken ct)
    {
        var zone = await repository.GetByIdAsync(command.ZoneId, ct);
        if (zone is null)
            return Result.Failure(ShippingZoneErrors.NotFound(command.ZoneId));

        repository.Remove(zone);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}