using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Shipping;
using FluentValidation;

namespace BookStore.Application.Shipping.Commands;

/// Full replacement of a zone's delivery details: standard carrier, estimate,
/// free-shipping threshold and paid extras. The flat rate stays where it is.
public sealed record SetShippingZoneDeliveryCommand(
    int ZoneId,
    string? StandardCarrier,
    int? StandardMinDays,
    int? StandardMaxDays,
    decimal? FreeShippingThreshold,
    IReadOnlyList<ShippingOptionInput>? Options) : ICommand<AdminShippingZoneDto>, IAuditableCommand
{
    public string AuditEntityType => "ShippingZone";
    public string? AuditEntityId => ZoneId.ToString();
}

public sealed class SetShippingZoneDeliveryCommandValidator : AbstractValidator<SetShippingZoneDeliveryCommand>
{
    public SetShippingZoneDeliveryCommandValidator()
    {
        RuleFor(x => x.ZoneId).GreaterThan(0);
        RuleFor(x => x.StandardCarrier).MaximumLength(100);
        RuleFor(x => x.FreeShippingThreshold).GreaterThan(0).PrecisionScale(18, 2, ignoreTrailingZeros: true)
            .When(x => x.FreeShippingThreshold.HasValue);
        RuleFor(x => x.Options!.Count).LessThanOrEqualTo(ShippingZone.MaxOptions).When(x => x.Options is not null);
        RuleForEach(x => x.Options).ChildRules(option =>
        {
            option.RuleFor(o => o.Code).NotEmpty().MaximumLength(30);
            option.RuleFor(o => o.Name).NotEmpty().MaximumLength(100);
            option.RuleFor(o => o.Carrier).MaximumLength(100);
            option.RuleFor(o => o.Price).GreaterThanOrEqualTo(0).PrecisionScale(18, 2, ignoreTrailingZeros: true);
        });
    }
}

public sealed class SetShippingZoneDeliveryCommandHandler(IShippingZoneRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetShippingZoneDeliveryCommand, AdminShippingZoneDto>
{
    public async Task<Result<AdminShippingZoneDto>> Handle(SetShippingZoneDeliveryCommand command, CancellationToken ct)
    {
        var zone = await repository.GetByIdAsync(command.ZoneId, ct);
        if (zone is null)
            return Result.Failure<AdminShippingZoneDto>(ShippingZoneErrors.NotFound(command.ZoneId));

        try
        {
            zone.SetDeliveryDetails(
                command.StandardCarrier, command.StandardMinDays, command.StandardMaxDays,
                command.FreeShippingThreshold, command.Options ?? []);
        }
        catch (ArgumentException ex)
        {
            // Code format, reserved codes, day ranges: the domain's message
            // says exactly what's wrong, so pass it to the admin.
            return Result.Failure<AdminShippingZoneDto>(Error.Validation("ShippingZone.InvalidDelivery", ex.Message));
        }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(zone.ToAdminDto());
    }
}