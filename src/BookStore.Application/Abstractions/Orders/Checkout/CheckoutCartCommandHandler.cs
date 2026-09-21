using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Payments;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Books;
using BookStore.Domain.Common;
using BookStore.Domain.Coupons;
using BookStore.Domain.Orders;
using Microsoft.Extensions.Logging;

namespace BookStore.Application.Orders.Checkout;

public sealed class CheckoutCartCommandHandler(
    IBookRepository bookRepository,
    IOrderRepository orderRepository,
    ICouponRepository couponRepository,
    IShippingZoneRepository shippingZoneRepository,
    IPaymentGateway paymentGateway,
    IUnitOfWork unitOfWork,
    ILogger<CheckoutCartCommandHandler> logger)
    : ICommandHandler<CheckoutCartCommand, CheckoutCartResponse>
{
    public async Task<Result<CheckoutCartResponse>> Handle(CheckoutCartCommand command, CancellationToken ct)
    {
        if (command.Lines.Count == 0)
            return Result.Failure<CheckoutCartResponse>(CheckoutErrors.EmptyCart);

        // 1. Shipping zone first — read-only, cheap, fails fast before we
        // touch anything mutable.
        var shippingZone = await shippingZoneRepository.GetByCountryCodeAsync(
            command.ShippingAddress.CountryCode, ct);

        if (shippingZone is null)
            return Result.Failure<CheckoutCartResponse>(
                CheckoutErrors.ShippingZoneNotFound(command.ShippingAddress.CountryCode));

        // 2. Load + sanity-check every line. Still read-only.
        var lineData = new List<(Book Book, int Quantity)>();
        foreach (var line in command.Lines)
        {
            var book = await bookRepository.GetByIdAsync(line.BookId, ct);
            if (book is null)
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.BookNotFound(line.BookId));

            if (book.AvailableToSell < line.Quantity)
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.InsufficientStock(line.BookId));

            lineData.Add((book, line.Quantity));
        }

        // 3. Coupon — validate in-memory (cheap, no DB write) before we
        // commit to redeeming it for real.
        Coupon? coupon = null;
        if (!string.IsNullOrWhiteSpace(command.CouponCode))
        {
            coupon = await couponRepository.GetByCodeAsync(command.CouponCode, ct);
            if (coupon is null)
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.CouponInvalid(command.CouponCode));

            try
            {
                coupon.ValidateForRedemption();
            }
            catch (Exception ex) when (ex is CouponInactiveException
                or CouponExpiredException or CouponUsageLimitReachedException)
            {
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.CouponInvalid(command.CouponCode));
            }
        }

        // 4. First real mutation: reserve stock line by line. Track what
        // succeeded so a later failure can be compensated.
        var reserved = new List<(int BookId, int Quantity)>();
        foreach (var (book, quantity) in lineData)
        {
            var ok = await bookRepository.TryReserveStockAsync(book.Id, quantity, ct);
            if (!ok)
            {
                await ReleaseReservationsAsync(reserved, ct);
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.InsufficientStock(book.Id));
            }

            reserved.Add((book.Id, quantity));
        }

        // 5. Redeem the coupon for real — deliberately after stock is
        // secured, so a coupon race doesn't burn a redemption for a
        // checkout that was going to fail anyway.
        if (coupon is not null)
        {
            var redeemed = await couponRepository.TryRedeemAsync(coupon.Code, ct);
            if (!redeemed)
            {
                await ReleaseReservationsAsync(reserved, ct);
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.CouponInvalid(coupon.Code));
            }
        }

        // 6. Build the Order aggregate in memory.
        var address = Address.Create(
            command.ShippingAddress.RecipientName,
            command.ShippingAddress.Line1,
            command.ShippingAddress.Line2,
            command.ShippingAddress.City,
            command.ShippingAddress.StateOrProvince,
            command.ShippingAddress.PostalCode,
            command.ShippingAddress.CountryCode);

        var order = Order.Create(command.CustomerEmail, address, command.Currency);

        foreach (var (book, quantity) in lineData)
            order.AddLine(book.Id, book.Title, quantity, book.Price);

        // Assumes a single-currency store — shippingZone.FlatRate and every
        // book.Price are expected to already be in command.Currency. If they
        // aren't, Money.Add throws inside RecalculateTotal rather than
        // silently mixing currencies. Fail loud, not quiet.
        order.SetShippingCost(shippingZone.FlatRate);

        if (coupon is not null)
            order.ApplyDiscount(coupon.Code, coupon.CalculateDiscount(order.Subtotal));

        // 7. Call Stripe. This is the one step we can't fully compensate:
        // stock gets released below on failure, but a coupon already
        // redeemed in step 5 stays burned. Accepted risk — Stripe outages
        // are rare, and holding a DB transaction open across a network call
        // is worse. The stock side has a real backstop once we build the
        // abandoned-session sweep job; the coupon side currently doesn't.
        CheckoutSessionResult session;
        try
        {
            session = await paymentGateway.CreateCheckoutSessionAsync(new CreateCheckoutSessionRequest(
                order.OrderNumber,
                order.CustomerEmail,
                order.Lines.Select(l => new CheckoutLineItem(
                    l.BookTitleSnapshot, l.UnitPriceAtPurchase.Amount, command.Currency, l.Quantity)).ToList(),
                order.ShippingCost.Amount,
                command.Currency,
                command.SuccessUrl,
                command.CancelUrl), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Stripe checkout session creation failed for {Email}", command.CustomerEmail);
            await ReleaseReservationsAsync(reserved, ct);
            return Result.Failure<CheckoutCartResponse>(CheckoutErrors.PaymentGatewayFailure);
        }

        order.AttachStripeCheckoutSession(session.SessionId);

        orderRepository.Add(order);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(new CheckoutCartResponse(order.OrderNumber, session.CheckoutUrl));
    }

    private async Task ReleaseReservationsAsync(List<(int BookId, int Quantity)> reserved, CancellationToken ct)
    {
        foreach (var (bookId, quantity) in reserved)
        {
            try
            {
                await bookRepository.ReleaseReservationAsync(bookId, quantity, ct);
            }
            catch (Exception ex)
            {
                // Best-effort. If even this fails (process crash, DB blip),
                // the reservation sits orphaned until the expiry sweep job
                // reclaims it later — that job is the real safety net, this
                // is just the fast path.
                logger.LogError(ex, "Failed to release stock reservation for book {BookId}", bookId);
            }
        }
    }
}