using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Common;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Shipping.Commands;

public sealed record UpdateShippingZoneCommand(
    int ZoneId,
    string Name,
    decimal FlatRate,
    IReadOnlyList<string> CountryCodes) : ICommand<AdminShippingZoneDto>;

public sealed class UpdateShippingZoneCommandValidator : AbstractValidator<UpdateShippingZoneCommand>
{
    public UpdateShippingZoneCommandValidator()
    {
        RuleFor(x => x.ZoneId).GreaterThan(0);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.FlatRate).GreaterThanOrEqualTo(0).PrecisionScale(18, 2, ignoreTrailingZeros: true);
        RuleFor(x => x.CountryCodes).NotEmpty();
        RuleForEach(x => x.CountryCodes)
            .Must(CountryCodes.IsValid)
            .WithMessage("'{PropertyValue}' is not a valid ISO 3166-1 alpha-2 country code.");
    }
}

public sealed class UpdateShippingZoneCommandHandler(
    IShippingZoneRepository repository,
    IUnitOfWork unitOfWork,
    IOptions<StoreOptions> storeOptions)
    : ICommandHandler<UpdateShippingZoneCommand, AdminShippingZoneDto>
{
    public async Task<Result<AdminShippingZoneDto>> Handle(UpdateShippingZoneCommand command, CancellationToken ct)
    {
        var zone = await repository.GetByIdAsync(command.ZoneId, ct);
        if (zone is null)
            return Result.Failure<AdminShippingZoneDto>(ShippingZoneErrors.NotFound(command.ZoneId));

        var ruleError = await ShippingZoneRules.CheckAsync(
            repository, command.Name, command.CountryCodes, excludeZoneId: zone.Id, ct);

        if (ruleError is not null)
            return Result.Failure<AdminShippingZoneDto>(ruleError);

        zone.Rename(command.Name);
        zone.UpdateRate(Money.From(command.FlatRate, storeOptions.Value.Currency));
        zone.ReplaceCountries(command.CountryCodes);

        // Rate changes only affect FUTURE checkouts. Every existing order
        // already snapshotted its own ShippingCost, so nothing historical moves.
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(zone.ToAdminDto());
    }
}