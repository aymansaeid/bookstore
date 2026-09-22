using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using FluentValidation;

namespace BookStore.Application.Coupons.Commands;

public sealed record UpdateCouponCommand(
    int CouponId,
    int DiscountPercentage,
    DateTimeOffset ExpiresAtUtc,
    int? MaxRedemptions) : ICommand<AdminCouponDto>;

public sealed class UpdateCouponCommandValidator : AbstractValidator<UpdateCouponCommand>
{
    public UpdateCouponCommandValidator()
    {
        RuleFor(x => x.CouponId).GreaterThan(0);
        RuleFor(x => x.DiscountPercentage).InclusiveBetween(1, 100);
        RuleFor(x => x.ExpiresAtUtc)
            .Must(d => d > DateTimeOffset.UtcNow)
            .WithMessage("Expiry must be in the future.");
        RuleFor(x => x.MaxRedemptions)
            .GreaterThan(0)
            .When(x => x.MaxRedemptions.HasValue);
    }
}

public sealed class UpdateCouponCommandHandler(ICouponRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<UpdateCouponCommand, AdminCouponDto>
{
    public async Task<Result<AdminCouponDto>> Handle(UpdateCouponCommand command, CancellationToken ct)
    {
        var coupon = await repository.GetByIdAsync(command.CouponId, ct);
        if (coupon is null)
            return Result.Failure<AdminCouponDto>(CouponErrors.NotFound(command.CouponId));

        if (command.MaxRedemptions.HasValue && command.MaxRedemptions.Value < coupon.TimesRedeemed)
            return Result.Failure<AdminCouponDto>(CouponErrors.MaxBelowRedeemed(coupon.TimesRedeemed));

        // Changing the discount only affects FUTURE checkouts. Past orders
        // snapshotted their own DiscountAmount.
        coupon.UpdateTerms(command.DiscountPercentage, command.ExpiresAtUtc, command.MaxRedemptions);

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(coupon.ToAdminDto());
    }
}