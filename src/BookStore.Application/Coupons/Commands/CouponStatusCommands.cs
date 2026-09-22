using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;

namespace BookStore.Application.Coupons.Commands;

public sealed record SetCouponActiveCommand(int CouponId, bool IsActive) : ICommand;

public sealed class SetCouponActiveCommandHandler(ICouponRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetCouponActiveCommand>
{
    public async Task<Result> Handle(SetCouponActiveCommand command, CancellationToken ct)
    {
        var coupon = await repository.GetByIdAsync(command.CouponId, ct);
        if (coupon is null)
            return Result.Failure(CouponErrors.NotFound(command.CouponId));

        if (command.IsActive) coupon.Activate();
        else coupon.Deactivate();

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed record DeleteCouponCommand(int CouponId) : ICommand;

public sealed class DeleteCouponCommandHandler(ICouponRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteCouponCommand>
{
    public async Task<Result> Handle(DeleteCouponCommand command, CancellationToken ct)
    {
        var coupon = await repository.GetByIdAsync(command.CouponId, ct);
        if (coupon is null)
            return Result.Failure(CouponErrors.NotFound(command.CouponId));

        if (coupon.HasBeenUsed)
            return Result.Failure(CouponErrors.CannotDeleteUsed(coupon.TimesRedeemed));

        repository.Remove(coupon);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}