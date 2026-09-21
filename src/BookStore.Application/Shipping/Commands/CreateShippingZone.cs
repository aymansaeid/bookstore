using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Common;
using BookStore.Domain.Shipping;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Shipping.Commands;

public sealed record CreateShippingZoneCommand(
    string Name,
    decimal FlatRate,
    IReadOnlyList<string> CountryCodes) : ICommand<AdminShippingZoneDto>;

public sealed class CreateShippingZoneCommandValidator : AbstractValidator<CreateShippingZoneCommand>
{
    public CreateShippingZoneCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.FlatRate).GreaterThanOrEqualTo(0).PrecisionScale(18, 2, ignoreTrailingZeros: true);
        RuleFor(x => x.CountryCodes).NotEmpty();
        RuleForEach(x => x.CountryCodes)
            .Must(CountryCodes.IsValid)
            .WithMessage("'{PropertyValue}' is not a valid ISO 3166-1 alpha-2 country code.");
    }
}

public sealed class CreateShippingZoneCommandHandler(
    IShippingZoneRepository repository,
    IUnitOfWork unitOfWork,
    IOptions<StoreOptions> storeOptions)
    : ICommandHandler<CreateShippingZoneCommand, AdminShippingZoneDto>
{
    public async Task<Result<AdminShippingZoneDto>> Handle(CreateShippingZoneCommand command, CancellationToken ct)
    {
        var ruleError = await ShippingZoneRules.CheckAsync(
            repository, command.Name, command.CountryCodes, excludeZoneId: null, ct);

        if (ruleError is not null)
            return Result.Failure<AdminShippingZoneDto>(ruleError);

        var zone = ShippingZone.Create(
            command.Name,
            Money.From(command.FlatRate, storeOptions.Value.Currency),
            command.CountryCodes);

        repository.Add(zone);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(zone.ToAdminDto());
    }
}