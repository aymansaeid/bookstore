using BookStore.Domain.Common;
using BookStore.Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders");
        builder.HasKey(o => o.Id);

        builder.Property(o => o.OrderNumber).HasMaxLength(50).IsRequired();
        builder.HasIndex(o => o.OrderNumber).IsUnique();

        builder.HasIndex(o => new { o.Status, o.PaidAtUtc });

        builder.Property(o => o.CustomerEmail).HasMaxLength(320).IsRequired();

        // Flattened, immutable snapshot — this is what makes historical
        // addresses survive even if the customer later moves.
        builder.OwnsOne(o => o.ShippingAddress, address =>
        {
            address.Property(a => a.RecipientName).HasColumnName("ShipTo_RecipientName").HasMaxLength(200).IsRequired();
            address.Property(a => a.Line1).HasColumnName("ShipTo_Line1").HasMaxLength(300).IsRequired();
            address.Property(a => a.Line2).HasColumnName("ShipTo_Line2").HasMaxLength(300);
            address.Property(a => a.City).HasColumnName("ShipTo_City").HasMaxLength(150).IsRequired();
            address.Property(a => a.StateOrProvince).HasColumnName("ShipTo_State").HasMaxLength(150);
            address.Property(a => a.PostalCode).HasColumnName("ShipTo_PostalCode").HasMaxLength(20).IsRequired();
            address.Property(a => a.CountryCode).HasColumnName("ShipTo_CountryCode").HasMaxLength(2).IsRequired();
            address.Property(a => a.Phone).HasColumnName("ShipTo_Phone").HasMaxLength(30).IsRequired();
        });
        builder.Navigation(o => o.ShippingAddress).IsRequired();

        ConfigureMoney(builder.OwnsOne(o => o.Subtotal), "Subtotal");
        ConfigureMoney(builder.OwnsOne(o => o.ShippingCost), "ShippingCost");
        ConfigureMoney(builder.OwnsOne(o => o.DiscountAmount), "Discount");
        ConfigureMoney(builder.OwnsOne(o => o.Total), "Total");
        builder.Navigation(o => o.Subtotal).IsRequired();
        builder.Navigation(o => o.ShippingCost).IsRequired();
        builder.Navigation(o => o.DiscountAmount).IsRequired();
        builder.Navigation(o => o.Total).IsRequired();

        builder.Property(o => o.AppliedCouponCode).HasMaxLength(50);
        builder.Property(o => o.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(o => o.CancellationReason).HasMaxLength(500);

        builder.Property(o => o.CheckoutIdempotencyKey).HasMaxLength(100).IsRequired();
        // Two concurrent submits with the same key: the second hits this index,
        // becomes a DuplicateEntryException, and checkout compensates.
        builder.HasIndex(o => o.CheckoutIdempotencyKey).IsUnique();

        builder.Property(o => o.CheckoutSessionId).HasMaxLength(200);
        builder.HasIndex(o => o.CheckoutSessionId).IsUnique().HasFilter("[CheckoutSessionId] IS NOT NULL");

        builder.Property(o => o.CheckoutUrl).HasMaxLength(2000);
        builder.Property(o => o.PaymentReference).HasMaxLength(200);
        builder.Property(o => o.RefundReference).HasMaxLength(200);
        builder.Property(o => o.TermsVersion).HasMaxLength(50).IsRequired();
        builder.Property(o => o.TermsAcceptedFromIp).HasMaxLength(45); // fits IPv6

        // The 6b sweep's query: pending orders past their expiry.
        builder.HasIndex(o => new { o.Status, o.CheckoutExpiresAtUtc });

        builder.Property(o => o.TrackingNumber).HasMaxLength(100);
        builder.Property(o => o.CustomerId);
        builder.HasIndex(o => o.CustomerId);

        builder.Property(o => o.RowVersion).IsRowVersion();

        builder.OwnsMany(o => o.Lines, line =>
        {
            line.ToTable("OrderLines");
            line.WithOwner().HasForeignKey("OrderId");
            line.HasKey(l => l.Id);
            line.HasIndex(l => l.BookId);
            line.Property(l => l.BookId).IsRequired();
            line.Property(l => l.BookTitleSnapshot).HasMaxLength(500).IsRequired();
            line.Property(l => l.Quantity).IsRequired();

            line.OwnsOne(l => l.UnitPriceAtPurchase, price =>
            {
                price.Property(m => m.Amount).HasColumnName("UnitPrice").HasColumnType("decimal(18,2)").IsRequired();
                price.Property(m => m.Currency).HasColumnName("Currency").HasMaxLength(3).IsRequired();
            });
            line.Navigation(l => l.UnitPriceAtPurchase).IsRequired();
        });

        // Lines has no public setter (get-only, backed by _lines.AsReadOnly())
        // by design — this tells EF to materialize through the private field
        // directly instead of looking for a setter that doesn't exist.
        builder.Metadata.FindNavigation(nameof(Order.Lines))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.Ignore(o => o.DomainEvents);
        builder.Property(o => o.ShippingCarrier).HasMaxLength(100);

        // The admin list filters by status and sorts newest-first; this index
        // covers exactly that. Email index is for "find this customer's orders".
        builder.HasIndex(o => new { o.Status, o.CreatedAtUtc });
        builder.HasIndex(o => o.CustomerEmail);

        builder.Property(o => o.ShippingMethodCode).HasMaxLength(30).IsRequired();
        builder.Property(o => o.ShippingMethodName).HasMaxLength(100);
        builder.Property(o => o.GiftWrap).IsRequired();
        builder.Property(o => o.GiftMessage).HasMaxLength(Order.MaxGiftMessageLength);

        ConfigureMoney(builder.OwnsOne(o => o.GiftWrapFee), "GiftWrapFee");
        builder.Navigation(o => o.GiftWrapFee).IsRequired();

        builder.Property(o => o.CancelledByCustomer).IsRequired();
    }

    private static void ConfigureMoney(OwnedNavigationBuilder<Order, Money> owned, string columnPrefix)
    {
        owned.Property(m => m.Amount).HasColumnName(columnPrefix).HasColumnType("decimal(18,2)").IsRequired();
        owned.Property(m => m.Currency).HasColumnName($"{columnPrefix}_Currency").HasMaxLength(3).IsRequired();
    }
}