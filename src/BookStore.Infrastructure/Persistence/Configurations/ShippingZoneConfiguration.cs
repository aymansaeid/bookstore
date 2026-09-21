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
    }
}