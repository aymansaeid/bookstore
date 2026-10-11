using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Books;
using BookStore.Application.Common;
using BookStore.Domain.Common;
using BookStore.Domain.Coupons;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Orders.Checkout;

public sealed record QuoteLineDto(
    int BookId, string Title, string Slug, string? CoverImageUrl, string? CoverThumbnailUrl,
    decimal UnitPrice, decimal? OldPrice, int Quantity, decimal LineTotal, bool Available);

public sealed record QuoteCouponDto(string Code, int DiscountPercentage);

public sealed record QuoteShippingOptionDto(
    string Code, string? Name, string? Carrier, decimal Price, bool IsFree,
    int? MinDays, int? MaxDays, bool IsPickup, bool IsRecommended);

public sealed record QuotePathDiscountDto(
    int ReadingPathId, string? Title, int DiscountPercentage, decimal Amount, bool Applied, IReadOnlyList<int> MissingBookIds);

public sealed record QuoteGiftWrapDto(bool Available, decimal Fee, bool Selected);

public sealed record CheckoutQuoteDto(
    string Currency,
    IReadOnlyList<QuoteLineDto> Lines,
    decimal Subtotal,
    QuoteCouponDto? Coupon,
    decimal DiscountAmount,
    IReadOnlyList<QuoteShippingOptionDto> ShippingOptions,
    string? SelectedShippingMethod,
    decimal ShippingCost,
    FreeShippingProgress? FreeShipping,
    QuoteGiftWrapDto GiftWrap,
    decimal Total,
    bool CanCheckout,
    IReadOnlyList<string> Problems,
    decimal PathDiscountAmount,
    QuotePathDiscountDto? PathDiscount);

public sealed record QuoteCheckoutQuery(
    IReadOnlyCollection<CartLineDto> Lines,
    string? CountryCode,
    int? SavedAddressId,
    string? CouponCode,
    string? ShippingMethod,
    bool GiftWrap,
    int? CustomerId,
    int? ReadingPathId = null) : IQuery<CheckoutQuoteDto>;

public sealed class QuoteCheckoutQueryValidator : AbstractValidator<QuoteCheckoutQuery>
{
    public QuoteCheckoutQueryValidator()
    {
        RuleFor(x => x.Lines)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .Must(lines => lines.Count <= 50)
            .Must(lines => lines.Select(l => l.BookId).Distinct().Count() == lines.Count)
            .WithMessage("Each book may appear only once in the cart.");

        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.BookId).GreaterThan(0);
            line.RuleFor(l => l.Quantity).InclusiveBetween(1, 10);
        });

        RuleFor(x => x.CountryCode).Length(2).When(x => !string.IsNullOrEmpty(x.CountryCode));
        RuleFor(x => x.CouponCode).MaximumLength(50);
        RuleFor(x => x.ShippingMethod).MaximumLength(30);
    }
}

/// Never fails on business problems: an out-of-stock line or a dead coupon
/// comes back as data, with full totals, so the cart page can always render.
public sealed class QuoteCheckoutQueryHandler(
    IBookRepository bookRepository,
    ICouponRepository couponRepository,
    IShippingZoneRepository shippingZoneRepository,
    ICustomerRepository customerRepository,
    IFileStorage fileStorage,
    IOptions<StoreOptions> storeOptions,
    PathDiscountCalculator pathDiscountCalculator)
    : IQueryHandler<QuoteCheckoutQuery, CheckoutQuoteDto>
{
    public async Task<Result<CheckoutQuoteDto>> Handle(QuoteCheckoutQuery query, CancellationToken ct)
    {
        var store = storeOptions.Value;
        var currency = store.Currency;
        var problems = new List<string>();

        // Country: from a saved address (signed-in customers), else the request.
        string? countryCode = query.CountryCode?.ToUpperInvariant();
        if (query.SavedAddressId is { } savedAddressId && query.CustomerId is { } customerId)
        {
            var customer = await customerRepository.GetByIdAsync(customerId, ct);
            var saved = customer?.Addresses.FirstOrDefault(a => a.Id == savedAddressId);
            if (saved is not null)
                countryCode = saved.CountryCode;
            else
                problems.Add("Checkout.SavedAddressNotFound");
        }

        // Lines: current prices, never the ones the browser remembers.
        var books = (await bookRepository.ListByIdsAsync(query.Lines.Select(l => l.BookId).ToList(), ct))
            .ToDictionary(b => b.Id);

        var lines = new List<QuoteLineDto>();
        var subtotal = Money.Zero(currency);

        foreach (var cartLine in query.Lines)
        {
            if (!books.TryGetValue(cartLine.BookId, out var book) || !book.IsActive)
            {
                problems.Add("Checkout.BookNotFound");
                continue;
            }

            var available = book.AvailableToSell >= cartLine.Quantity;
            if (!available)
                problems.Add("Checkout.InsufficientStock");

            var lineTotal = book.Price.MultiplyBy(cartLine.Quantity);
            subtotal = subtotal.Add(lineTotal);

            lines.Add(new QuoteLineDto(
                book.Id, book.Title, book.Slug.Value, BookMappings.CoverUrl(book, fileStorage),
                BookMappings.CoverThumbnailUrl(book, fileStorage),
                book.Price.Amount, book.SavingsAmount is null ? null : book.CompareAtPrice,
                cartLine.Quantity, lineTotal.Amount, available));
        }

        // Coupon: same validity rule as checkout; the reason stays vague.
        Coupon? coupon = null;
        if (!string.IsNullOrWhiteSpace(query.CouponCode))
        {
            var candidate = await couponRepository.GetByCodeAsync(query.CouponCode, ct);
            try
            {
                candidate?.ValidateForRedemption();
                coupon = candidate;
            }
            catch (Exception ex) when (ex is CouponInactiveException
                or CouponExpiredException or CouponUsageLimitReachedException)
            {
                coupon = null;
            }

            if (coupon is null)
                problems.Add("Checkout.CouponInvalid");
        }

        // Same order of operations as checkout: path discount, then coupon on the rest.
        var pathDiscount = await pathDiscountCalculator.CalculateAsync(
            query.ReadingPathId, query.CustomerId, lines.Select(l => l.BookId).ToHashSet(), currency, ct);

        if (pathDiscount.Problem is not null)
            problems.Add(pathDiscount.Problem);

        var pathAmount = pathDiscount.Applies ? pathDiscount.Amount : Money.Zero(currency);
        var afterPath = subtotal.Subtract(pathAmount);

        var discount = CheckoutPricing.Discount(coupon, afterPath);
        var merchandiseTotal = afterPath.Subtract(discount);

        // Shipping: same function checkout charges with.
        var zone = countryCode is null ? null : await shippingZoneRepository.GetByCountryCodeAsync(countryCode, ct);
        var options = CheckoutPricing.ShippingOptions(zone, merchandiseTotal, store.Pickup, countryCode);

        ShippingChoice? selected = null;
        if (countryCode is null)
        {
            problems.Add("Checkout.ShippingCountryMissing");
        }
        else if (options.Count == 0)
        {
            problems.Add("Checkout.ShippingZoneNotSupported");
        }
        else
        {
            var requested = query.ShippingMethod?.Trim().ToLowerInvariant();
            selected = requested is null ? options[0] : options.FirstOrDefault(o => o.Code == requested);
            if (selected is null)
                problems.Add("Checkout.ShippingMethodUnavailable");
        }

        var shippingCost = selected?.Price ?? Money.Zero(currency);

        // Gift wrap.
        var giftWrapSelected = query.GiftWrap && store.GiftWrap.Enabled;
        if (query.GiftWrap && !store.GiftWrap.Enabled)
            problems.Add("Checkout.GiftWrapUnavailable");

        var giftWrapFee = giftWrapSelected ? Money.From(store.GiftWrap.Fee, currency) : Money.Zero(currency);

        var total = subtotal.Subtract(pathAmount).Subtract(discount).Add(shippingCost).Add(giftWrapFee);
        var distinctProblems = problems.Distinct().ToList();

        return Result.Success(new CheckoutQuoteDto(
            currency,
            lines,
            subtotal.Amount,
            coupon is null ? null : new QuoteCouponDto(coupon.Code, coupon.DiscountPercentage),
            discount.Amount,
            options.Select(o => new QuoteShippingOptionDto(
                o.Code, o.Name, o.Carrier, o.Price.Amount, o.IsFree, o.MinDays, o.MaxDays, o.IsPickup, o.IsRecommended)).ToList(),
            selected?.Code,
            shippingCost.Amount,
            CheckoutPricing.Progress(zone, merchandiseTotal),
            new QuoteGiftWrapDto(store.GiftWrap.Enabled, store.GiftWrap.Fee, giftWrapSelected),
            total.Amount,
            CanCheckout: lines.Count > 0 && distinctProblems.Count == 0,
            distinctProblems,
            pathAmount.Amount,
            pathDiscount.ReadingPathId is { } pathId
                ? new QuotePathDiscountDto(pathId, pathDiscount.PathTitle, pathDiscount.DiscountPercentage,
                    pathAmount.Amount, pathDiscount.Applies, pathDiscount.MissingBookIds)
                : null));
    }
}