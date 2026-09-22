using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Coupons;
using FluentValidation;

namespace BookStore.Application.Coupons.Queries;

public sealed record GetAdminCouponsQuery : IQuery<IReadOnlyList<AdminCouponDto>>;

public sealed class GetAdminCouponsQueryHandler(ICouponRepository repository)
    : IQueryHandler<GetAdminCouponsQuery, IReadOnlyList<AdminCouponDto>>
{
    public async Task<Result<IReadOnlyList<AdminCouponDto>>> Handle(GetAdminCouponsQuery query, CancellationToken ct)
    {
        var coupons = await repository.ListAsync(ct);
        return Result.Success<IReadOnlyList<AdminCouponDto>>(coupons.Select(c => c.ToAdminDto()).ToList());
    }
}

public sealed record GetAdminCouponByIdQuery(int CouponId) : IQuery<AdminCouponDto>;

public sealed class GetAdminCouponByIdQueryHandler(ICouponRepository repository)
    : IQueryHandler<GetAdminCouponByIdQuery, AdminCouponDto>
{
    public async Task<Result<AdminCouponDto>> Handle(GetAdminCouponByIdQuery query, CancellationToken ct)
    {
        var coupon = await repository.GetByIdAsync(query.CouponId, ct);
        return coupon is null
            ? Result.Failure<AdminCouponDto>(CouponErrors.NotFound(query.CouponId))
            : Result.Success(coupon.ToAdminDto());
    }
}

public sealed record CheckCouponQuery(string Code) : IQuery<CouponPreviewDto>;

public sealed class CheckCouponQueryValidator : AbstractValidator<CheckCouponQuery>
{
    public CheckCouponQueryValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
    }
}

public sealed class CheckCouponQueryHandler(ICouponRepository repository)
    : IQueryHandler<CheckCouponQuery, CouponPreviewDto>
{
    public async Task<Result<CouponPreviewDto>> Handle(CheckCouponQuery query, CancellationToken ct)
    {
        var coupon = await repository.GetByCodeAsync(query.Code, ct);
        if (coupon is null)
            return Result.Failure<CouponPreviewDto>(CouponErrors.Invalid);

        // Reuses the exact same domain rule checkout uses. Preview and real
        // checkout can never disagree about whether a coupon is valid.
        try
        {
            coupon.ValidateForRedemption();
        }
        catch (Exception ex) when (ex is CouponInactiveException
            or CouponExpiredException or CouponUsageLimitReachedException)
        {
            return Result.Failure<CouponPreviewDto>(CouponErrors.Invalid);
        }

        // Preview only; nothing is redeemed or reserved here. A coupon
        // that's valid now can still run out before the customer checks out,
        // and checkout will catch that with its own atomic redemption.
        return Result.Success(new CouponPreviewDto(coupon.Code, coupon.DiscountPercentage));
    }
}