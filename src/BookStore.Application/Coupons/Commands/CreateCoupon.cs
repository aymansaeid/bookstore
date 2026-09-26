using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Coupons;
using FluentValidation;

namespace BookStore.Application.Coupons.Commands;

public sealed record CreateCouponCommand(
    string Code,
    int DiscountPercentage,
    DateTimeOffset ExpiresAtUtc,
    int? MaxRedemptions) : ICommand<AdminCouponDto>, IAuditableCommand
{
    public string AuditEntityType => "Coupon";
    public string? AuditEntityId => Code;
}

public sealed class CreateCouponCommandValidator : AbstractValidator<CreateCouponCommand>
{
    public CreateCouponCommandValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty()
            .Length(3, 50)
            .Matches("^[A-Za-z0-9_-]+$")
            .WithMessage("Code may contain only letters, numbers, dashes and underscores.");

        RuleFor(x => x.DiscountPercentage).InclusiveBetween(1, 100);

        RuleFor(x => x.ExpiresAtUtc)
            .Must(d => d > DateTimeOffset.UtcNow)
            .WithMessage("Expiry must be in the future.");

        RuleFor(x => x.MaxRedemptions)
            .GreaterThan(0)
            .When(x => x.MaxRedemptions.HasValue);
    }
}

public sealed class CreateCouponCommandHandler(ICouponRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<CreateCouponCommand, AdminCouponDto>
{
    public async Task<Result<AdminCouponDto>> Handle(CreateCouponCommand command, CancellationToken ct)
    {
        if (await repository.CodeExistsAsync(command.Code, ct))
            return Result.Failure<AdminCouponDto>(CouponErrors.DuplicateCode(command.Code.Trim().ToUpperInvariant()));

        var coupon = Coupon.Create(command.Code, command.DiscountPercentage, command.ExpiresAtUtc, command.MaxRedemptions);

        repository.Add(coupon);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(coupon.ToAdminDto());
    }
}