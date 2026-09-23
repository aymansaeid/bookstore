using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Payments;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Books;
using BookStore.Domain.Common;
using BookStore.Domain.Coupons;
using BookStore.Domain.Customers;
using BookStore.Domain.Orders;
using Microsoft.Extensions.Logging;

namespace BookStore.Application.Orders.Checkout;

public sealed class CheckoutCartCommandHandler(
    IBookRepository bookRepository,
    IOrderRepository orderRepository,
    ICustomerRepository customerRepository,
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

        // 1. Resolve the address first: either the one they typed, or one from their
        // address book (only if it really belongs to them).
        Address address;
        Customer? customer = null;

        if (command.CustomerId is { } customerId)
        {
            customer = await customerRepository.GetByIdAsync(customerId, ct);
            if (customer is null || !customer.IsActive)
            {
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.CustomerNotFound);
            }
        }

        if (command.SavedAddressId is { } savedAddressId)
        {
            // Ownership check: a saved address id from another customer must never
            // resolve, or checkout becomes an address-book read primitive.
            var saved = customer?.Addresses.FirstOrDefault(a => a.Id == savedAddressId);
            if (saved is null)
            {
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.SavedAddressNotFound);
            }

            address = saved.ToOrderAddress();
        }
        else
        {
            var dto = command.ShippingAddress!;
            address = Address.Create(
                dto.RecipientName, dto.Phone, dto.Line1, dto.Line2,
                dto.City, dto.StateOrProvince, dto.PostalCode, dto.CountryCode);
        }

        // 2. Shipping zone — read-only, cheap, fails fast before we touch anything mutable.
        var shippingZone = await shippingZoneRepository.GetByCountryCodeAsync(address.CountryCode, ct);

        if (shippingZone is null)
            return Result.Failure<CheckoutCartResponse>(
                CheckoutErrors.ShippingZoneNotFound(address.CountryCode));

        // 3. Load + sanity-check every line. Still read-only.
        var lineData = new List<(Book Book, int Quantity)>();
        foreach (var line in command.Lines)
        {
            var book = await bookRepository.GetByIdAsync(line.BookId, ct);
            if (book is null || !book.IsActive)
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.BookNotFound(line.BookId));

            if (book.AvailableToSell < line.Quantity)
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.InsufficientStock(line.BookId));

            lineData.Add((book, line.Quantity));
        }

        // 4. Coupon — validate in-memory (cheap, no DB write) before we
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

        // 5. First real mutation: reserve stock line by line. Track what
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

        // 6. Redeem the coupon for real — deliberately after stock is
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

        // 7. Build the Order aggregate in memory.
        var order = Order.Create(command.CustomerEmail, address, command.Currency);

        if (customer is not null)
            order.AssignToCustomer(customer.Id);

        foreach (var (book, quantity) in lineData)
            order.AddLine(book.Id, book.Title, quantity, book.Price);

        order.SetShippingCost(shippingZone.FlatRate);

        if (coupon is not null)
            order.ApplyDiscount(coupon.Code, coupon.CalculateDiscount(order.Subtotal));

        // 8. Call Stripe. 
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
                logger.LogError(ex, "Failed to release stock reservation for book {BookId}", bookId);
            }
        }
    }
}