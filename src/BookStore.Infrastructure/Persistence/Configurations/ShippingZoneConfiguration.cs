using BookStore.Domain.Shipping;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class ShippingZoneConfiguration : IEntityTypeConfiguration<ShippingZone>
{
    public void Configure(EntityTypeBuilder<ShippingZone> builder)
    {
        builder.ToTable("ShippingZones");
        builder.HasKey(z => z.Id);
        builder.Property(z => z.Name).HasMaxLength(200).IsRequired();
        builder.Property(z => z.IsActive).IsRequired();

        builder.OwnsOne(z => z.FlatRate, rate =>
        {
            rate.Property(m => m.Amount).HasColumnName("FlatRate").HasColumnType("decimal(18,2)").IsRequired();
            rate.Property(m => m.Currency).HasColumnName("Currency").HasMaxLength(3).IsRequired();
        });
        builder.Navigation(z => z.FlatRate).IsRequired();

        builder.PrimitiveCollection(z => z.CountryCodes)
            .HasColumnName("CountryCodes")
            .HasField("_countryCodes")
            .UsePropertyAccessMode(PropertyAccessMode.Field)
            .ElementType(e => e.HasMaxLength(2));

        builder.Property(z => z.StandardCarrier).HasMaxLength(100);
        builder.Property(z => z.StandardMinDays);
        builder.Property(z => z.StandardMaxDays);
        builder.Property(z => z.FreeShippingThreshold).HasColumnType("decimal(18,2)");

        builder.OwnsMany(z => z.Options, option =>
        {
            option.ToTable("ShippingOptions");
            option.WithOwner().HasForeignKey("ShippingZoneId");
            option.HasKey(o => o.Id);

            option.Property(o => o.Code).HasMaxLength(30).IsRequired();
            option.Property(o => o.Name).HasMaxLength(100).IsRequired();
            option.Property(o => o.Carrier).HasMaxLength(100);
            option.Property(o => o.Price).HasColumnType("decimal(18,2)").IsRequired();
            option.Property(o => o.DisplayOrder).IsRequired();

            option.HasIndex("ShippingZoneId", nameof(ShippingOption.Code)).IsUnique();
        });

        builder.Metadata.FindNavigation(nameof(ShippingZone.Options))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);
    }
}