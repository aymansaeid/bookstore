using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Payments;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Payments;
using BookStore.Domain.Books;
using BookStore.Domain.Common;
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
        var isPickup = CheckoutCartCommandValidator.IsPickup(command);

        // 0a. Idempotent replay.
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

        // 0b. Current terms only.
        if (!string.Equals(command.AcceptedTermsVersion, payments.CurrentTermsVersion, StringComparison.Ordinal))
            return Result.Failure<CheckoutCartResponse>(CheckoutErrors.TermsOutdated(payments.CurrentTermsVersion));

        // 0c. Options that need no data: refuse early.
        if (isPickup && !store.Pickup.Enabled)
            return Result.Failure<CheckoutCartResponse>(CheckoutErrors.ShippingMethodUnavailable(CheckoutPricing.PickupCode));
        if (command.GiftWrap && !store.GiftWrap.Enabled)
            return Result.Failure<CheckoutCartResponse>(CheckoutErrors.GiftWrapUnavailable);

        // 1. Customer and contact/address (read-only).
        Customer? customer = null;
        if (command.CustomerId is { } customerId)
        {
            customer = await customerRepository.GetByIdAsync(customerId, ct);
            if (customer is null || !customer.IsActive)
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.CustomerNotFound);
        }

        string recipientName, phone, countryCode;
        Address? deliveryAddress = null;

        if (command.SavedAddressId is { } savedAddressId)
        {
            var saved = customer?.Addresses.FirstOrDefault(a => a.Id == savedAddressId);
            if (saved is null)
                return Result.Failure<CheckoutCartResponse>(CheckoutErrors.SavedAddressNotFound);

            recipientName = saved.RecipientName;
            phone = saved.Phone;
            countryCode = saved.CountryCode;
            if (!isPickup)
                deliveryAddress = saved.ToOrderAddress();
        }
        else
        {
            var dto = command.ShippingAddress!;
            recipientName = dto.RecipientName;
            phone = dto.Phone;
            countryCode = string.IsNullOrWhiteSpace(dto.CountryCode) ? store.Pickup.CountryCode : dto.CountryCode.ToUpperInvariant();

            if (!isPickup)
                deliveryAddress = Address.Create(
                    dto.RecipientName, dto.Phone, dto.Line1, dto.Line2,
                    dto.City, dto.StateOrProvince, dto.PostalCode, dto.CountryCode);
        }

        // Pickup: the "delivery" address is the shop, with the collector's
        // name and phone, so packing lists and labels are always correct.
        var address = deliveryAddress ?? Address.Create(
            recipientName, phone, store.Pickup.AddressLine1, null,
            store.Pickup.City, null, store.Pickup.PostalCode, store.Pickup.CountryCode);

        var customerEmail = customer?.Email ?? command.CustomerEmail;

        // 2. Books (read-only).
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

        // 3. Coupon (in memory).
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

        // 4. Shipping method, priced by the SAME code the quote uses, from
        // the books total after coupon.
        var subtotal = lineData.Aggregate(
            Money.Zero(store.Currency), (sum, l) => sum.Add(l.Book.Price.MultiplyBy(l.Quantity)));
        var merchandiseTotal = subtotal.Subtract(CheckoutPricing.Discount(coupon, subtotal));

        var zone = isPickup ? null : await shippingZoneRepository.GetByCountryCodeAsync(countryCode, ct);
        if (!isPickup && zone is null)
            return Result.Failure<CheckoutCartResponse>(CheckoutErrors.ShippingZoneNotFound(countryCode));

        var requestedMethod = (command.ShippingMethod ?? CheckoutPricing.StandardCode).Trim().ToLowerInvariant();
        var shippingChoice = CheckoutPricing
            .ShippingOptions(zone, merchandiseTotal, store.Pickup, countryCode)
            .FirstOrDefault(o => o.Code == requestedMethod);

        if (shippingChoice is null)
            return Result.Failure<CheckoutCartResponse>(CheckoutErrors.ShippingMethodUnavailable(requestedMethod));

        // 5. First real mutation: reserve stock.
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

        // 6. Redeem the coupon.
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

        // 7. Build the order.
        var order = Order.Create(
            customerEmail, address, store.Currency,
            command.IdempotencyKey, payments.CurrentTermsVersion, command.ClientIp);

        if (customer is not null)
            order.AssignToCustomer(customer.Id);

        foreach (var (book, quantity) in lineData)
            order.AddLine(book.Id, book.Title, quantity, book.Price);

        if (coupon is not null)
            order.ApplyDiscount(coupon.Code, coupon.CalculateDiscount(order.Subtotal));

        order.SetShippingMethod(shippingChoice.Code, shippingChoice.DisplayName, shippingChoice.Price);

        if (command.GiftWrap)
            order.AddGiftWrap(Money.From(store.GiftWrap.Fee, store.Currency), command.GiftMessage);

        // 8. Payment session.
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
                command.IdempotencyKey,
                order.GiftWrapFee.Amount), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Payment session creation failed for order {OrderNumber}", order.OrderNumber);
            await CompensateAsync(reserved, redeemedCouponCode, sessionId: null, ct);
            return Result.Failure<CheckoutCartResponse>(CheckoutErrors.PaymentGatewayFailure);
        }

        // 9. Persist; the session dies with a failed save.
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

    private async Task CompensateAsync(
        List<(int BookId, int Quantity)> reserved, string? redeemedCouponCode, string? sessionId, CancellationToken ct)
    {
        if (sessionId is not null)
        {
            try { await paymentGateway.ExpireSessionAsync(sessionId, ct); }
            catch (Exception ex) { logger.LogError(ex, "Failed to expire orphaned checkout session {SessionId}", sessionId); }
        }

        foreach (var (bookId, quantity) in reserved)
        {
            try { await bookRepository.ReleaseReservationAsync(bookId, quantity, ct); }
            catch (Exception ex) { logger.LogError(ex, "Failed to release reservation for book {BookId}", bookId); }
        }

        if (redeemedCouponCode is not null)
        {
            try { await couponRepository.ReleaseRedemptionAsync(redeemedCouponCode, ct); }
            catch (Exception ex) { logger.LogError(ex, "Failed to release coupon redemption for {Code}", redeemedCouponCode); }
        }
    }
}