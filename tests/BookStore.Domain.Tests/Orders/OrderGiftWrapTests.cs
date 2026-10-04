using BookStore.Domain.Common;
using BookStore.Domain.Orders;
using FluentAssertions;

namespace BookStore.Domain.Tests.Orders;

public class OrderGiftWrapTests
{
    [Fact]
    public void Total_IncludesShippingAndGiftWrap()
    {
        var address = Address.Create("Buyer", "5550000000", "Line 1", null, "Istanbul", null, "34000", "TR");
        var order = Order.Create("buyer@example.com", address, "TRY", "idem-key-0001", "2026-09", null);

        order.AddLine(1, "Book", 2, Money.From(500m, "TRY"));           // 1000
        order.ApplyDiscount("TEN", Money.From(100m, "TRY"));            // -100
        order.SetShippingMethod("express", "Aras", Money.From(90m, "TRY")); // +90
        order.AddGiftWrap(Money.From(50m, "TRY"), "  كل عام وأنت بخير  ");  // +50

        order.Total.Amount.Should().Be(1040m);
        order.GiftMessage.Should().Be("كل عام وأنت بخير");
        order.ShippingMethodCode.Should().Be("express");
    }
}