using BookStore.Domain.Books;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class BookConfiguration : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> builder)
    {
        builder.ToTable("Books", t =>
        {
            // Belt-and-suspenders: the domain already refuses to let these
            // go invalid, this just means the DB refuses too if anything
            // ever bypasses the aggregate (a hand-written migration, a
            // support script, whatever).
            t.HasCheckConstraint("CK_Books_StockNonNegative", "[StockQuantity] >= 0");
            t.HasCheckConstraint("CK_Books_ReservedNotExceedStock", "[ReservedQuantity] <= [StockQuantity]");
        });

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Title).HasMaxLength(500).IsRequired();
        builder.Property(b => b.Author).HasMaxLength(300).IsRequired();
        builder.Property(b => b.Isbn).HasMaxLength(20);
        builder.Property(b => b.Description).HasMaxLength(4000);

        builder.OwnsOne(b => b.Price, price =>
        {
            price.Property(m => m.Amount).HasColumnName("Price").HasColumnType("decimal(18,2)").IsRequired();
            price.Property(m => m.Currency).HasColumnName("Currency").HasMaxLength(3).IsRequired();
        });
        builder.Navigation(b => b.Price).IsRequired();

        builder.Property(b => b.StockQuantity).IsRequired();
        builder.Property(b => b.ReservedQuantity).IsRequired();
        builder.Property(b => b.RowVersion).IsRowVersion();

        builder.HasIndex(b => b.Isbn).IsUnique().HasFilter("[Isbn] IS NOT NULL AND [Isbn] <> ''");
    }
}