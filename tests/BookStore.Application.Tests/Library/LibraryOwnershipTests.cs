using BookStore.Application.Library;
using BookStore.Domain.Common;
using BookStore.Domain.Library;
using BookStore.Domain.Orders;
using BookStore.Domain.Returns;
using FluentAssertions;

namespace BookStore.Application.Tests.Library;

public class LibraryOwnershipTests
{
    private static Order OrderWith(int bookId, int quantity, string stage)
    {
        var address = Address.Create("Buyer", "5550000000", "Line 1", null, "Istanbul", null, "34000", "TR");
        var order = Order.Create("buyer@example.com", address, "TRY", $"idem-{Guid.NewGuid():N}", "1", null);
        order.AddLine(bookId, "Book", quantity, Money.From(100m, "TRY"));

        if (stage is "paid" or "shipped" or "delivered") order.MarkAsPaid("pi");
        if (stage is "shipped" or "delivered") order.Ship("PTT", "TR1");
        if (stage is "delivered") order.Deliver();
        if (stage is "cancelled") order.Cancel("x");

        return order;
    }

    [Fact]
    public void Delivered_IsPurchased_AndPaid_IsOnTheWay()
    {
        var owned = LibraryOwnershipCalculator.Compute(
            [OrderWith(1, 1, "delivered"), OrderWith(2, 1, "paid")], [], []);

        owned[1].Ownership.Should().Be(LibraryOwnership.Purchased);
        owned[2].Ownership.Should().Be(LibraryOwnership.OnTheWay);
    }

    [Fact]
    public void CancelledAndUnpaidOrders_DontCount()
    {
        var owned = LibraryOwnershipCalculator.Compute(
            [OrderWith(1, 1, "cancelled"), OrderWith(2, 1, "pending")], [], []);

        owned.Should().BeEmpty();
    }

    [Fact]
    public void FullyReturnedBook_LeavesTheShelf_PartialReturnKeepsIt()
    {
        var single = OrderWith(1, 1, "delivered");
        var double_ = OrderWith(2, 2, "delivered");

        var returnAll = ReturnRequest.Create(single, [new ReturnItem(1, 1)], ReturnReason.ChangedMind, null);
        returnAll.Approve(1, "send");
        returnAll.Complete(1, new Dictionary<int, ReturnItemCondition> { [1] = ReturnItemCondition.Resellable }, "re");

        var returnOne = ReturnRequest.Create(double_, [new ReturnItem(2, 1)], ReturnReason.ChangedMind, null);
        returnOne.Approve(1, "send");
        returnOne.Complete(1, new Dictionary<int, ReturnItemCondition> { [2] = ReturnItemCondition.Resellable }, "re");

        var owned = LibraryOwnershipCalculator.Compute([single, double_], [returnAll, returnOne], []);

        owned.Should().NotContainKey(1);
        owned[2].Ownership.Should().Be(LibraryOwnership.Purchased);
    }

    [Fact]
    public void ManualEntry_AddsBook_ButPurchaseWins()
    {
        var manual = LibraryEntry.Create(customerId: 1, bookId: 5);
        manual.MarkOwnedManually();
        var manualAlsoBought = LibraryEntry.Create(customerId: 1, bookId: 1);
        manualAlsoBought.MarkOwnedManually();

        var owned = LibraryOwnershipCalculator.Compute([OrderWith(1, 1, "delivered")], [], [manual, manualAlsoBought]);

        owned[5].Ownership.Should().Be(LibraryOwnership.AddedManually);
        owned[1].Ownership.Should().Be(LibraryOwnership.Purchased);
    }
}