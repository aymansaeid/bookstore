using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Payments;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Payments;
using BookStore.Domain.Books;
using BookStore.Domain.Coupons;
using BookStore.Domain.Customers;
using BookStore.Domain.Orders;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Orders.Checkout;

public sealed class CheckoutCartCommandHandler(
    IBookRepository bookRepository,
    IOrderRepository orderRepository,
    ICouponRepository couponRepository,
    IShippingZoneRepository shippingZoneRepository,
    ICustomerRepository customerRepository,
    IPaymentGateway paymentGateway,
    IUnitOfWork unitOfWork,
    IOptions<StoreOptions> storeOptions,
    IOptions<PaymentOptions> paymentOptions,
    ILogger<CheckoutCartCommandHandler> logger)
    : ICommandHandler<CheckoutCartCommand, CheckoutCartResponse>
{
    public async Task<Result<CheckoutCartResponse>> Handle(CheckoutCartCommand command, CancellationToken ct)
    {
        var store = storeOptions.Value;
        var payments = paymentOptions.Value;

        // 0a. Idempotent replay: a retried request (network blip, double
        // click) gets the original checkout back instead of reserving stock
        // a second time.
        var previous = await orderRepository.GetByIdempotencyKeyAsync(command.IdempotencyKey, ct);
        if (previous is not null)
        {
            var sameRequester = previous.CustomerEmail == command.CustomerEmail.Trim().ToLowerInvariant();

            if (sameRequester
                && previous.Status == OrderStatus.PendingPayment
                && previous.CheckoutUrl is not null
                && previous.CheckoutExpiresAtUtc is { } previousExpiry)
            {
                return Result.Success(new CheckoutCartResponse(previous.OrderNumber, previous.CheckoutUrl, previousExpiry));
            }

            return Result.Failure<CheckoutCartResponse>(CheckoutErrors.IdempotencyKeyReused);
        }

        // 0b. The customer must have accepted the CURRENT terms text.
        if (!string.Equals(command.AcceptedTermsVersion, payments.CurrentTermsVersion, StringComparison.Ordinal))
            return Result.Failure<CheckoutCartResponse>(CheckoutErrors.TermsOutdated(payments.CurrentTermsVersion));

        // 1. Resolve customer and address (read-only). Must come before the
        // shipping zone: with a saved address, the country lives on the
        // saved address, not in the request.
        Customer? customer = null;
        if (command.CustomerId is { } customerId)
        {
            customer = await customerRepository.GetByIdAsync(customerId, ct);
            if (customer is null || !customer.IsActive)
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.CustomerNotFound);
        }

        Address address;
        if (command.SavedAddressId is { } savedAddressId)
        {
            // Ownership check: another customer's saved address id must never resolve.
            var saved = customer?.Addresses.FirstOrDefault(a => a.Id == savedAddressId);
            if (saved is null)
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.SavedAddressNotFound);

            address = saved.ToOrderAddress();
        }
        else
        {
            var dto = command.ShippingAddress!;
            address = Address.Create(
                dto.RecipientName, dto.Phone, dto.Line1, dto.Line2,
                dto.City, dto.StateOrProvince, dto.PostalCode, dto.CountryCode);
        }

        // A signed-in customer's orders always use their verified account
        // email, never whatever was typed into the form.
        var customerEmail = customer?.Email ?? command.CustomerEmail;

        // 2. Shipping zone.
        var shippingZone = await shippingZoneRepository.GetByCountryCodeAsync(address.CountryCode, ct);
        if (shippingZone is null)
            return Result.Failure<CheckoutCartResponse>(CheckoutErrors.ShippingZoneNotFound(address.CountryCode));

        // 3. Load and sanity-check every line (read-only).
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

        // 4. Coupon: validate in memory before committing to anything.
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

        // 5. First real mutation: reserve stock atomically, line by line.
        var reserved = new List<(int BookId, int Quantity)>();
        foreach (var (book, quantity) in lineData)
        {
            if (!await bookRepository.TryReserveStockAsync(book.Id, quantity, ct))
            {
                await CompensateAsync(reserved, redeemedCouponCode: null, sessionId: null, ct);
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.InsufficientStock(book.Id));
            }

            reserved.Add((book.Id, quantity));
        }

        // 6. Redeem the coupon, after stock is secured.
        string? redeemedCouponCode = null;
        if (coupon is not null)
        {
            if (!await couponRepository.TryRedeemAsync(coupon.Code, ct))
            {
                await CompensateAsync(reserved, redeemedCouponCode: null, sessionId: null, ct);
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.CouponInvalid(coupon.Code));
            }

            redeemedCouponCode = coupon.Code;
        }

        // 7. Build the order in memory. Currency comes from the store
        // config, never from the client.
        var order = Order.Create(
            customerEmail, address, store.Currency,
            command.IdempotencyKey, payments.CurrentTermsVersion, command.ClientIp);

        if (customer is not null)
            order.AssignToCustomer(customer.Id);

        foreach (var (book, quantity) in lineData)
            order.AddLine(book.Id, book.Title, quantity, book.Price);

        order.SetShippingCost(shippingZone.FlatRate);

        if (coupon is not null)
            order.ApplyDiscount(coupon.Code, coupon.CalculateDiscount(order.Subtotal));

        // 8. Open the payment session. Redirect URLs come from config, so a
        // client can never make the payment page redirect to its own site.
        var orderQuery = $"?order={Uri.EscapeDataString(order.OrderNumber)}";
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(payments.CheckoutSessionMinutes);

        CheckoutSessionResult session;
        try
        {
            session = await paymentGateway.CreateCheckoutSessionAsync(new CreateCheckoutSessionRequest(
                order.OrderNumber,
                order.CustomerEmail,
                order.Lines.Select(l => new CheckoutLineItem(
                    l.BookTitleSnapshot, l.UnitPriceAtPurchase.Amount, l.Quantity)).ToList(),
                order.ShippingCost.Amount,
                order.DiscountAmount.Amount,
                order.Total.Amount,
                order.Total.Currency,
                $"{store.StorefrontBaseUrl}{payments.SuccessPath}{orderQuery}",
                $"{store.StorefrontBaseUrl}{payments.CancelPath}{orderQuery}",
                expiresAt,
                command.IdempotencyKey), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Payment session creation failed for order {OrderNumber}", order.OrderNumber);
            await CompensateAsync(reserved, redeemedCouponCode, sessionId: null, ct);
            return Result.Failure<CheckoutCartResponse>(CheckoutErrors.PaymentGatewayFailure);
        }

        // 9. Persist. If this fails, the session must die with it: a live
        // session with no order behind it could still be paid.
        try
        {
            order.AttachCheckoutSession(session.SessionId, session.CheckoutUrl, session.ExpiresAtUtc);
            orderRepository.Add(order);
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch
        {
            await CompensateAsync(reserved, redeemedCouponCode, session.SessionId, ct);
            throw;
        }

        return Result.Success(new CheckoutCartResponse(order.OrderNumber, session.CheckoutUrl, session.ExpiresAtUtc));
    }

    /// Best-effort undo of everything checkout did before failing. Each step
    /// is independent; one failure doesn't stop the others. Anything left
    /// behind (an orphaned reservation) is reclaimed by the sweep in 6b.
    private async Task CompensateAsync(
        List<(int BookId, int Quantity)> reserved, string? redeemedCouponCode, string? sessionId, CancellationToken ct)
    {
        if (sessionId is not null)
        {
            try
            {
                await paymentGateway.ExpireSessionAsync(sessionId, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to expire orphaned checkout session {SessionId}", sessionId);
            }
        }

        foreach (var (bookId, quantity) in reserved)
        {
            try
            {
                await bookRepository.ReleaseReservationAsync(bookId, quantity, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to release reservation for book {BookId}", bookId);
            }
        }

        if (redeemedCouponCode is not null)
        {
            // Closes the gap from the coupons step: a failed checkout no
            // longer permanently burns a coupon use.
            try
            {
                await couponRepository.ReleaseRedemptionAsync(redeemedCouponCode, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to release coupon redemption for {Code}", redeemedCouponCode);
            }
        }
    }
}