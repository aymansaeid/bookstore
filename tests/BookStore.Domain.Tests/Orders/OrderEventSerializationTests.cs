using System.Text.Json;
using BookStore.Application.Abstractions.Outbox;
using BookStore.Domain.Orders.Events;
using FluentAssertions;

namespace BookStore.Domain.Tests.Orders;

public class OrderEventSerializationTests
{
    [Fact]
    public void OrderPaidEvent_RoundTripsLineData()
    {
        var original = new OrderPaidDomainEvent(
            42, "BK-ABC123", "buyer@example.com",
            [new OrderLineSnapshot(7, 2), new OrderLineSnapshot(9, 1)],
            DateTimeOffset.UtcNow);

        var json = JsonSerializer.Serialize(original, original.GetType(), OutboxSerialization.Options);
        var restored = OutboxSerialization.Deserialize<OrderPaidDomainEvent>(json);

        restored.OrderId.Should().Be(42);
        restored.OrderNumber.Should().Be("BK-ABC123");
        restored.Lines.Should().HaveCount(2);
        restored.Lines.Should().ContainEquivalentOf(new OrderLineSnapshot(7, 2));
    }
}