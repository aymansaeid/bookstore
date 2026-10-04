using BookStore.Application.Abstractions.Outbox;
using BookStore.Domain.Common;
using BookStore.Domain.Orders;
using BookStore.Domain.Orders.Events;
using FluentAssertions;

namespace BookStore.Domain.Tests.Orders;

public class OrderCancellationTests
{
    private static Order PaidOrder()
    {
        var address = Address.Create("Buyer", "5550000000", "Line 1", null, "Istanbul", null, "34000", "TR");
        var order = Order.Create("buyer@example.com", address, "TRY", "idem-key-0001", "2026-09", null);
        order.AddLine(1, "Book", 1, Money.From(500m, "TRY"));
        order.MarkAsPaid("pi_1");
        order.ClearDomainEvents();
        return order;
    }

    [Fact]
    public void CustomerCancel_IsRecorded_AndFlaggedOnTheEvent()
    {
        var order = PaidOrder();

        order.Cancel("Customer: OrderedByMistake", byCustomer: true);

        order.CancelledByCustomer.Should().BeTrue();
        order.DomainEvents.OfType<OrderCancelledDomainEvent>().Single().ByCustomer.Should().BeTrue();
    }

    [Fact]
    public void ShippedOrder_CannotBeCancelled()
    {
        var order = PaidOrder();
        order.Ship("PTT", "TR1");

        order.CanBeCancelled.Should().BeFalse();
        var act = () => order.Cancel("Customer: ChangedMind", byCustomer: true);
        act.Should().Throw<InvalidOrderStateTransitionException>();
    }

    [Fact]
    public void OldOutboxPayload_WithoutByCustomer_StillDeserializes()
    {
        // An event written before this field existed.
        const string legacy = """
            { "orderId": 1, "orderNumber": "BK-1", "customerEmail": "a@b.com", "wasPaid": true,
              "lines": [], "occurredOnUtc": "2026-09-01T10:00:00+00:00" }
            """;

        var e = OutboxSerialization.Deserialize<OrderCancelledDomainEvent>(legacy);

        e.ByCustomer.Should().BeFalse();
        e.OrderNumber.Should().Be("BK-1");
    }
}