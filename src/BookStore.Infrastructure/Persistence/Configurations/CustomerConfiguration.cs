using BookStore.Domain.Customers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("Customers");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Email).HasMaxLength(320).IsRequired();
        builder.HasIndex(c => c.Email).IsUnique();

        builder.Property(c => c.PasswordHash).HasMaxLength(500).IsRequired();
        builder.Property(c => c.FirstName).HasMaxLength(100).IsRequired();
        builder.Property(c => c.LastName).HasMaxLength(100).IsRequired();
        builder.Property(c => c.Phone).HasMaxLength(30);
        builder.Property(c => c.IsEmailVerified).IsRequired();
        builder.Property(c => c.IsActive).IsRequired();
        builder.Property(c => c.IsAnonymized).IsRequired();
        builder.Property(c => c.AcceptsMarketingEmails).IsRequired();
        builder.Property(c => c.RowVersion).IsRowVersion();

        builder.OwnsMany(c => c.Addresses, address =>
        {
            address.ToTable("CustomerAddresses");
            address.WithOwner().HasForeignKey("CustomerId");
            address.HasKey(a => a.Id);

            address.Property(a => a.Label).HasMaxLength(50).IsRequired();
            address.Property(a => a.RecipientName).HasMaxLength(200).IsRequired();
            address.Property(a => a.Phone).HasMaxLength(30).IsRequired();
            address.Property(a => a.Line1).HasMaxLength(300).IsRequired();
            address.Property(a => a.Line2).HasMaxLength(300);
            address.Property(a => a.City).HasMaxLength(150).IsRequired();
            address.Property(a => a.StateOrProvince).HasMaxLength(150);
            address.Property(a => a.PostalCode).HasMaxLength(20).IsRequired();
            address.Property(a => a.CountryCode).HasMaxLength(2).IsRequired();
            address.Property(a => a.IsDefault).IsRequired();
        });

        builder.Metadata.FindNavigation(nameof(Customer.Addresses))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.Ignore(c => c.FullName);
        builder.Ignore(c => c.DomainEvents);
    }
}