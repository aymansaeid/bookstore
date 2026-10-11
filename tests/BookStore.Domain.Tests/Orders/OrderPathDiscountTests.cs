using BookStore.Domain.Common;
using BookStore.Domain.Orders;
using FluentAssertions;

namespace BookStore.Domain.Tests.Orders;

public class OrderPathDiscountTests
{
    private static Order Order()
    {
        var address = Address.Create("Buyer", "5550000000", "Line 1", null, "Istanbul", null, "34000", "TR");
        var order = Domain.Orders.Order.Create("buyer@example.com", address, "TRY", "idem-key-0001", "1", null);
        order.AddLine(1, "A", 1, Money.From(1000m, "TRY"));
        order.AddLine(2, "B", 1, Money.From(2150m, "TRY"));
        return order;
    }

    [Fact]
    public void PathThenCoupon_DontStackOnTheOriginalPrice()
    {
        var order = Order();                                                // 3150

        order.ApplyPathDiscount(7, Money.From(315m, "TRY"));                // 10% -> 2835
        order.ApplyDiscount("TEN", Money.From(283.50m, "TRY"));             // 10% of 2835

        order.PathDiscountAmount.Amount.Should().Be(315m);
        order.CouponDiscountAmount.Amount.Should().Be(283.50m);
        order.DiscountAmount.Amount.Should().Be(598.50m);
        order.Total.Amount.Should().Be(2551.50m);
        order.AppliedReadingPathId.Should().Be(7);
    }

    [Fact]
    public void PathDiscount_AfterCoupon_IsRejected()
    {
        var order = Order();
        order.ApplyDiscount("TEN", Money.From(315m, "TRY"));

        var act = () => order.ApplyPathDiscount(7, Money.From(100m, "TRY"));

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void OrderWithoutPath_CouponDiscountEqualsTotalDiscount()
    {
        var order = Order();
        order.ApplyDiscount("TEN", Money.From(315m, "TRY"));

        order.CouponDiscountAmount.Amount.Should().Be(order.DiscountAmount.Amount);
        order.PathDiscountAmount.Amount.Should().Be(0m);
    }
}