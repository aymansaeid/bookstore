using BookStore.Domain.Common;
using BookStore.Domain.Orders.Events;

namespace BookStore.Domain.Orders;

public sealed class Order : AggregateRoot<int>
{
    // Customer-facing identifier. Never expose the int Id publicly.
    public string OrderNumber { get; private set; } = string.Empty;

    public int? CustomerId { get; private set; }
    public string CustomerEmail { get; private set; } = string.Empty;

    public Address ShippingAddress { get; private set; } = null!;

    private readonly List<OrderLine> _lines = [];
    public IReadOnlyCollection<OrderLine> Lines => _lines.AsReadOnly();

    public Money Subtotal { get; private set; } = null!;
    public Money ShippingCost { get; private set; } = null!;
    public Money DiscountAmount { get; private set; } = null!;
    public Money Total { get; private set; } = null!;
    public string? AppliedCouponCode { get; private set; }

    public OrderStatus Status { get; private set; }
    public string? CancellationReason { get; private set; }

    /// Client-generated key for this checkout attempt. A retried request with
    /// the same key gets the original order back instead of a second one.
    public string CheckoutIdempotencyKey { get; private set; } = string.Empty;

    // Gateway-neutral: whichever provider you choose, these hold its ids.
    public string? CheckoutSessionId { get; private set; }
    public string? CheckoutUrl { get; private set; }
    public DateTimeOffset? CheckoutExpiresAtUtc { get; private set; }
    public string? PaymentReference { get; private set; }
    public string? RefundReference { get; private set; }
    public DateTimeOffset? RefundedAtUtc { get; private set; }

    // Distance sales contract acceptance: which text, when, and from where.
    public string TermsVersion { get; private set; } = string.Empty;
    public DateTimeOffset TermsAcceptedAtUtc { get; private set; }
    public string? TermsAcceptedFromIp { get; private set; }

    public string? ShippingCarrier { get; private set; }
    public string? TrackingNumber { get; private set; }

    public const int MaxGiftMessageLength = 300;

    /// "standard", "pickup", or a zone extra's code, as chosen at checkout.
    public string ShippingMethodCode { get; private set; } = "standard";

    /// Snapshot of the method's display name (carrier or option name) at purchase.
    public string? ShippingMethodName { get; private set; }

    public bool GiftWrap { get; private set; }
    public Money GiftWrapFee { get; private set; } = null!;
    public string? GiftMessage { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? PaidAtUtc { get; private set; }
    public DateTimeOffset? ShippedAtUtc { get; private set; }
    public DateTimeOffset? DeliveredAtUtc { get; private set; }
    public DateTimeOffset? CancelledAtUtc { get; private set; }

    public byte[] RowVersion { get; private set; } = [];

    public bool CanBeMarkedPaid => Status == OrderStatus.PendingPayment;
    public bool CanBeShipped => Status == OrderStatus.Paid;
    public bool CanBeDelivered => Status == OrderStatus.Shipped;
    public bool CanCorrectTracking => Status == OrderStatus.Shipped;
    public bool CanBeCancelled => Status is OrderStatus.PendingPayment or OrderStatus.Paid;
    public bool CanBeExpired => Status == OrderStatus.PendingPayment;
    public bool CanBeRefunded => Status is OrderStatus.Paid or OrderStatus.Shipped or OrderStatus.Delivered;

    private Order() { } // EF Core

    public static Order Create(
        string customerEmail,
        Address shippingAddress,
        string currency,
        string checkoutIdempotencyKey,
        string termsVersion,
        string? termsAcceptedFromIp)
    {
        if (string.IsNullOrWhiteSpace(customerEmail))
            throw new ArgumentException("Customer email is required.", nameof(customerEmail));
        if (string.IsNullOrWhiteSpace(checkoutIdempotencyKey))
            throw new ArgumentException("An idempotency key is required.", nameof(checkoutIdempotencyKey));
        if (string.IsNullOrWhiteSpace(termsVersion))
            throw new ArgumentException("The accepted terms version is required.", nameof(termsVersion));

        var now = DateTimeOffset.UtcNow;

        return new Order
        {
            OrderNumber = GenerateOrderNumber(),
            CustomerEmail = customerEmail.Trim().ToLowerInvariant(),
            ShippingAddress = shippingAddress,
            Subtotal = Money.Zero(currency),
            ShippingCost = Money.Zero(currency),
            DiscountAmount = Money.Zero(currency),
            Total = Money.Zero(currency),
            Status = OrderStatus.PendingPayment,
            CheckoutIdempotencyKey = checkoutIdempotencyKey.Trim(),
            TermsVersion = termsVersion.Trim(),
            TermsAcceptedAtUtc = now,
            TermsAcceptedFromIp = termsAcceptedFromIp,
            GiftWrapFee = Money.Zero(currency),
            CreatedAtUtc = now
        };
    }

    private static string GenerateOrderNumber()
    {
        var random = Guid.NewGuid().ToString("N")[..10].ToUpperInvariant();
        return $"BK-{random}";
    }

    public void AssignToCustomer(int customerId)
    {
        if (CustomerId is not null)
            throw new InvalidOperationException("This order already belongs to a customer.");

        CustomerId = customerId;
    }

    public void AttachCheckoutSession(string sessionId, string checkoutUrl, DateTimeOffset expiresAtUtc)
    {
        if (Status != OrderStatus.PendingPayment)
            throw new InvalidOrderStateTransitionException(Id, Status, "attach a checkout session to");
        if (string.IsNullOrWhiteSpace(sessionId))
            throw new ArgumentException("Checkout session id is required.", nameof(sessionId));
        if (string.IsNullOrWhiteSpace(checkoutUrl))
            throw new ArgumentException("Checkout URL is required.", nameof(checkoutUrl));

        CheckoutSessionId = sessionId;
        CheckoutUrl = checkoutUrl;
        CheckoutExpiresAtUtc = expiresAtUtc;
    }

    public void AddLine(int bookId, string bookTitleSnapshot, int quantity, Money unitPrice)
    {
        if (Status != OrderStatus.PendingPayment)
            throw new InvalidOrderStateTransitionException(Id, Status, "modify lines on");

        if (_lines.Any(l => l.BookId == bookId))
            throw new InvalidOperationException(
                $"Book {bookId} is already on this order; adjust quantity instead of adding a duplicate line.");

        _lines.Add(OrderLine.Create(bookId, bookTitleSnapshot, quantity, unitPrice));
        RecalculateSubtotal();
    }

    public void SetShippingCost(Money shippingCost)
    {
        if (Status != OrderStatus.PendingPayment)
            throw new InvalidOrderStateTransitionException(Id, Status, "change shipping cost on");

        ShippingCost = shippingCost;
        RecalculateTotal();
    }

    public void ApplyDiscount(string couponCode, Money discountAmount)
    {
        if (Status != OrderStatus.PendingPayment)
            throw new InvalidOrderStateTransitionException(Id, Status, "apply a coupon to");

        AppliedCouponCode = couponCode;
        DiscountAmount = discountAmount;
        RecalculateTotal();
    }

    public void MarkAsPaid(string paymentReference)
    {
        if (!CanBeMarkedPaid)
            throw new InvalidOrderStateTransitionException(Id, Status, "mark as paid");
        if (string.IsNullOrWhiteSpace(paymentReference))
            throw new ArgumentException("Payment reference is required.", nameof(paymentReference));

        Status = OrderStatus.Paid;
        PaymentReference = paymentReference;
        PaidAtUtc = DateTimeOffset.UtcNow;

        Raise(new OrderPaidDomainEvent(
            Id, OrderNumber, CustomerEmail,
            _lines.Select(l => new OrderLineSnapshot(l.BookId, l.Quantity)).ToList(),
            DateTimeOffset.UtcNow));
    }

    /// No domain event: expiry is fully handled inside the sweep's own
    /// transaction, and nothing needs to react to it asynchronously. (An
    /// abandoned-cart reminder email would be marketing under KVKK and needs
    /// consent, so it's a deliberate future decision, not a side effect.)
    public void Expire()
    {
        if (!CanBeExpired)
            throw new InvalidOrderStateTransitionException(Id, Status, "expire");

        Status = OrderStatus.Expired;
    }

    public void Cancel(string reason)
    {
        if (!CanBeCancelled)
            throw new InvalidOrderStateTransitionException(Id, Status, "cancel");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("A cancellation reason is required.", nameof(reason));

        var wasPaid = Status == OrderStatus.Paid;
        Status = OrderStatus.Cancelled;
        CancellationReason = reason.Trim();
        CancelledAtUtc = DateTimeOffset.UtcNow;

        Raise(new OrderCancelledDomainEvent(
            Id, OrderNumber, CustomerEmail, wasPaid,
            _lines.Select(l => new OrderLineSnapshot(l.BookId, l.Quantity)).ToList(),
            DateTimeOffset.UtcNow));
    }

    /// Records a refund the gateway has already executed. Once per order:
    /// a second call means something upstream is trying to refund twice.
    public void RecordRefund(string refundReference)
    {
        if (PaymentReference is null)
            throw new InvalidOperationException("Cannot record a refund for an order that was never paid.");
        if (RefundReference is not null)
            throw new InvalidOperationException("This order has already been refunded.");
        if (Status is not (OrderStatus.Cancelled or OrderStatus.Refunded))
            throw new InvalidOrderStateTransitionException(Id, Status, "record a refund on");
        if (string.IsNullOrWhiteSpace(refundReference))
            throw new ArgumentException("Refund reference is required.", nameof(refundReference));

        RefundReference = refundReference;
        RefundedAtUtc = DateTimeOffset.UtcNow;
    }

    public void Ship(string carrier, string trackingNumber)
    {
        if (!CanBeShipped)
            throw new InvalidOrderStateTransitionException(Id, Status, "ship");
        if (string.IsNullOrWhiteSpace(carrier))
            throw new ArgumentException("Carrier is required.", nameof(carrier));
        if (string.IsNullOrWhiteSpace(trackingNumber))
            throw new ArgumentException("Tracking number is required.", nameof(trackingNumber));

        Status = OrderStatus.Shipped;
        ShippingCarrier = carrier.Trim();
        TrackingNumber = trackingNumber.Trim();
        ShippedAtUtc = DateTimeOffset.UtcNow;

        Raise(new OrderShippedDomainEvent(
            Id, OrderNumber, CustomerEmail, ShippingCarrier, TrackingNumber, DateTimeOffset.UtcNow));
    }

    public void CorrectTrackingInfo(string carrier, string trackingNumber)
    {
        if (!CanCorrectTracking)
            throw new InvalidOrderStateTransitionException(Id, Status, "correct tracking info on");
        if (string.IsNullOrWhiteSpace(carrier))
            throw new ArgumentException("Carrier is required.", nameof(carrier));
        if (string.IsNullOrWhiteSpace(trackingNumber))
            throw new ArgumentException("Tracking number is required.", nameof(trackingNumber));

        ShippingCarrier = carrier.Trim();
        TrackingNumber = trackingNumber.Trim();
    }

    public void Deliver()
    {
        if (!CanBeDelivered)
            throw new InvalidOrderStateTransitionException(Id, Status, "mark as delivered");

        Status = OrderStatus.Delivered;
        DeliveredAtUtc = DateTimeOffset.UtcNow;
    }

    public void Refund()
    {
        if (!CanBeRefunded)
            throw new InvalidOrderStateTransitionException(Id, Status, "refund");

        Status = OrderStatus.Refunded;
    }

    /// KVKK: scrub personal data while keeping the order for invoicing.
    public void AnonymizeCustomerData()
    {
        CustomerEmail = $"deleted-{Guid.NewGuid():N}@anonymized.invalid";
        ShippingAddress = Address.Create(
            "Deleted User", "0000000000", "Redacted", null,
            ShippingAddress.City, null, "00000", ShippingAddress.CountryCode);
        TermsAcceptedFromIp = null;
        GiftMessage = null;
    }

    private void RecalculateSubtotal()
    {
        var currency = Subtotal.Currency;
        Subtotal = _lines.Aggregate(Money.Zero(currency), (sum, line) => sum.Add(line.LineTotal));
        RecalculateTotal();
    }

    private void RecalculateTotal()
    {
        // Same order as CheckoutPricing's quote: books, minus coupon, plus
        // shipping, plus gift wrap. Keep these two in step.
        Total = Subtotal.Subtract(DiscountAmount).Add(ShippingCost).Add(GiftWrapFee);
    }

    public void SetShippingMethod(string code, string? name, Money cost)
    {
        if (Status != OrderStatus.PendingPayment)
            throw new InvalidOrderStateTransitionException(Id, Status, "change shipping on");
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Shipping method code is required.", nameof(code));

        ShippingMethodCode = code.Trim().ToLowerInvariant();
        ShippingMethodName = string.IsNullOrWhiteSpace(name) ? null : name.Trim();
        ShippingCost = cost;
        RecalculateTotal();
    }

    public void AddGiftWrap(Money fee, string? message)
    {
        if (Status != OrderStatus.PendingPayment)
            throw new InvalidOrderStateTransitionException(Id, Status, "add gift wrap to");

        var trimmed = string.IsNullOrWhiteSpace(message) ? null : message.Trim();
        if (trimmed is { Length: > MaxGiftMessageLength })
            throw new ArgumentException($"Gift message can be at most {MaxGiftMessageLength} characters.", nameof(message));

        GiftWrap = true;
        GiftWrapFee = fee;
        GiftMessage = trimmed;
        RecalculateTotal();
    }
}