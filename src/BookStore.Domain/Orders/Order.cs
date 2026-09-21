using BookStore.Domain.Common;
using BookStore.Domain.Orders.Events;

namespace BookStore.Domain.Orders;

public sealed class Order : AggregateRoot<int>
{
    // Customer-facing identifier. Never expose the int Id — sequential PKs
    // on a guest-checkout store let anyone walk /order/1, /order/2... and
    // read other people's names and addresses.
    public string OrderNumber { get; private set; } = string.Empty;
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

    public string? StripeCheckoutSessionId { get; private set; }
    public string? StripePaymentIntentId { get; private set; }
    public string? TrackingNumber { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? PaidAtUtc { get; private set; }
    public DateTimeOffset? ShippedAtUtc { get; private set; }
    public DateTimeOffset? DeliveredAtUtc { get; private set; }
    public DateTimeOffset? CancelledAtUtc { get; private set; }

    // Guards admin-driven concurrent edits (e.g. two staff touching the same
    // order at once). Not involved in the checkout reservation race — see
    // the note on Book.RowVersion.
    public byte[] RowVersion { get; private set; } = [];

    private Order() { } // EF Core

    public static Order Create(
        string customerEmail,
        Address shippingAddress,
        string currency,
        string stripeCheckoutSessionId)
    {
        if (string.IsNullOrWhiteSpace(customerEmail))
            throw new ArgumentException("Customer email is required.", nameof(customerEmail));
        if (string.IsNullOrWhiteSpace(stripeCheckoutSessionId))
            throw new ArgumentException("Stripe checkout session id is required.", nameof(stripeCheckoutSessionId));

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
            StripeCheckoutSessionId = stripeCheckoutSessionId,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };
    }

    private static string GenerateOrderNumber()
    {
        var random = Guid.NewGuid().ToString("N")[..10].ToUpperInvariant();
        return $"BK-{random}";
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

    private void RecalculateSubtotal()
    {
        var currency = Subtotal.Currency;
        Subtotal = _lines.Aggregate(Money.Zero(currency), (sum, line) => sum.Add(line.LineTotal));
        RecalculateTotal();
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

    private void RecalculateTotal()
    {
        Total = Subtotal.Subtract(DiscountAmount).Add(ShippingCost);
    }

    public void MarkAsPaid(string stripePaymentIntentId)
    {
        if (Status != OrderStatus.PendingPayment)
            throw new InvalidOrderStateTransitionException(Id, Status, "mark as paid");

        Status = OrderStatus.Paid;
        StripePaymentIntentId = stripePaymentIntentId;
        PaidAtUtc = DateTimeOffset.UtcNow;

        Raise(new OrderPaidDomainEvent(
            Id, OrderNumber, CustomerEmail,
            _lines.Select(l => (l.BookId, l.Quantity)).ToList(),
            DateTimeOffset.UtcNow));
    }

    /// Stripe Checkout Session expired unpaid — release the stock reservation
    /// taken at order creation so another customer can buy it.
    public void Expire()
    {
        if (Status != OrderStatus.PendingPayment)
            throw new InvalidOrderStateTransitionException(Id, Status, "expire");

        Status = OrderStatus.Expired;

        Raise(new OrderExpiredDomainEvent(
            Id, _lines.Select(l => (l.BookId, l.Quantity)).ToList(),
            DateTimeOffset.UtcNow));
    }

    public void Cancel(string reason)
    {
        if (Status is not (OrderStatus.PendingPayment or OrderStatus.Paid))
            throw new InvalidOrderStateTransitionException(Id, Status, "cancel");

        var wasPaid = Status == OrderStatus.Paid;
        Status = OrderStatus.Cancelled;
        CancellationReason = reason;
        CancelledAtUtc = DateTimeOffset.UtcNow;

        Raise(new OrderCancelledDomainEvent(
            Id, OrderNumber, CustomerEmail, wasPaid,
            _lines.Select(l => (l.BookId, l.Quantity)).ToList(),
            DateTimeOffset.UtcNow));
    }

    public void Ship(string trackingNumber)
    {
        if (Status != OrderStatus.Paid)
            throw new InvalidOrderStateTransitionException(Id, Status, "ship");
        if (string.IsNullOrWhiteSpace(trackingNumber))
            throw new ArgumentException("Tracking number is required.", nameof(trackingNumber));

        Status = OrderStatus.Shipped;
        TrackingNumber = trackingNumber;
        ShippedAtUtc = DateTimeOffset.UtcNow;

        Raise(new OrderShippedDomainEvent(Id, OrderNumber, CustomerEmail, trackingNumber, DateTimeOffset.UtcNow));
    }

    public void Deliver()
    {
        if (Status != OrderStatus.Shipped)
            throw new InvalidOrderStateTransitionException(Id, Status, "mark as delivered");

        Status = OrderStatus.Delivered;
        DeliveredAtUtc = DateTimeOffset.UtcNow;
    }

    public void Refund()
    {
        if (Status is not (OrderStatus.Paid or OrderStatus.Shipped or OrderStatus.Delivered))
            throw new InvalidOrderStateTransitionException(Id, Status, "refund");

        Status = OrderStatus.Refunded;
    }
}