using FluentValidation;

namespace BookStore.Application.Orders.Checkout;

public sealed class CheckoutCartCommandValidator : AbstractValidator<CheckoutCartCommand>
{
    public CheckoutCartCommandValidator()
    {
        RuleFor(x => x.CustomerEmail).NotEmpty().EmailAddress().MaximumLength(320);

        RuleFor(x => x.Lines)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .Must(lines => lines.Select(l => l.BookId).Distinct().Count() == lines.Count)
            .WithMessage("Each book may appear only once in the cart.");

        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.BookId).GreaterThan(0);
            line.RuleFor(l => l.Quantity).InclusiveBetween(1, 10);
        });

        RuleFor(x => x)
            .Must(x => (x.ShippingAddress is not null) ^ (x.SavedAddressId is not null))
            .WithMessage("Provide either a shipping address or a saved address id, not both.");

        RuleFor(x => x.ShippingAddress!)
            .SetValidator(new ShippingAddressDtoValidator())
            .When(x => x.ShippingAddress is not null);

        RuleFor(x => x.SavedAddressId).GreaterThan(0).When(x => x.SavedAddressId is not null);

        RuleFor(x => x.CouponCode).MaximumLength(50);

        RuleFor(x => x.AcceptedTermsVersion)
            .NotEmpty().WithMessage("You must accept the terms of sale.")
            .MaximumLength(50);

        RuleFor(x => x.IdempotencyKey)
            .NotEmpty().WithMessage("The Idempotency-Key header is required.")
            .Length(8, 100);
    }
}

public sealed class ShippingAddressDtoValidator : AbstractValidator<ShippingAddressDto>
{
    public ShippingAddressDtoValidator()
    {
        RuleFor(x => x.RecipientName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(30);
        RuleFor(x => x.Line1).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Line2).MaximumLength(300);
        RuleFor(x => x.City).NotEmpty().MaximumLength(150);
        RuleFor(x => x.StateOrProvince).MaximumLength(150);
        RuleFor(x => x.PostalCode).NotEmpty().MaximumLength(20);
        RuleFor(x => x.CountryCode).NotEmpty().Length(2);
    }
}