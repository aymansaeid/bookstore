using BookStore.Application.Common;
using BookStore.Application.Orders.Checkout;
using BookStore.Domain.Common;
using BookStore.Domain.Shipping;
using FluentAssertions;

namespace BookStore.Application.Tests.Checkout;

public class CheckoutPricingTests
{
    private static readonly PickupSettings Pickup = new()
    {
        Enabled = true,
        AddressLine1 = "Shop",
        PostalCode = "34000",
        CountryCode = "TR",
        ReadyInDays = 1
    };

    private static ShippingZone TurkeyZone()
    {
        var zone = ShippingZone.Create("Turkey", Money.From(60m, "TRY"), ["TR"]);
        zone.SetDeliveryDetails("Yurtiçi Kargo", 2, 4, freeShippingThreshold: 1500m,
            [new ShippingOptionInput("express", "Aras السريع", "Aras Kargo", 90m, 1, 2)]);
        return zone;
    }

    private static Money Try(decimal amount) => Money.From(amount, "TRY");

    [Fact]
    public void BelowThreshold_StandardCostsTheFlatRate()
    {
        var options = CheckoutPricing.ShippingOptions(TurkeyZone(), Try(1499.99m), Pickup, "TR");

        options.Single(o => o.Code == "standard").Price.Amount.Should().Be(60m);
    }

    [Fact]
    public void AtThreshold_StandardIsFree_ButExpressIsNot()
    {
        var options = CheckoutPricing.ShippingOptions(TurkeyZone(), Try(1500m), Pickup, "TR");

        options.Single(o => o.Code == "standard").IsFree.Should().BeTrue();
        options.Single(o => o.Code == "express").Price.Amount.Should().Be(90m);
    }

    [Fact]
    public void Pickup_OnlyForTheShopsCountry()
    {
        CheckoutPricing.ShippingOptions(TurkeyZone(), Try(100m), Pickup, "TR")
            .Should().Contain(o => o.IsPickup);

        CheckoutPricing.ShippingOptions(null, Try(100m), Pickup, "DE")
            .Should().BeEmpty();
    }

    [Fact]
    public void Progress_ReportsRemainingAmount()
    {
        var progress = CheckoutPricing.Progress(TurkeyZone(), Try(1200m))!;

        progress.Remaining.Should().Be(300m);
        progress.Qualified.Should().BeFalse();
    }
}