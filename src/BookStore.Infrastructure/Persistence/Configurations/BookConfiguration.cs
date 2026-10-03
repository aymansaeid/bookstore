using BookStore.Domain.Books;
using BookStore.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class BookConfiguration : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> builder)
    {
        builder.ToTable("Books", t =>
        {
            t.HasCheckConstraint("CK_Books_StockNonNegative", "[StockQuantity] >= 0");
            t.HasCheckConstraint("CK_Books_ReservedNotExceedStock", "[ReservedQuantity] <= [StockQuantity]");

            // A double release (e.g. expiring the same order twice) would otherwise
            // push this negative and silently inflate "available to sell".
            t.HasCheckConstraint("CK_Books_ReservedNonNegative", "[ReservedQuantity] >= 0");
        });

        builder.HasKey(b => b.Id);

        builder.Property(b => b.Title).HasMaxLength(500).IsRequired();
        builder.Property(b => b.Subtitle).HasMaxLength(500);
        builder.Property(b => b.Author).HasMaxLength(300).IsRequired();
        builder.Property(b => b.Isbn).HasMaxLength(20);
        builder.Property(b => b.Description).HasMaxLength(4000);

        builder.Property(b => b.Slug)
            .HasConversion(slug => slug.Value, value => Slug.Create(value))
            .HasColumnName("Slug")
            .HasMaxLength(200)
            .IsRequired();
        builder.HasIndex(b => b.Slug).IsUnique();

        builder.Property(b => b.Format).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(b => b.PageCount).IsRequired();
        builder.Property(b => b.Language).HasMaxLength(2).IsRequired();
        builder.Property(b => b.Publisher).HasMaxLength(300);
        builder.Property(b => b.PublicationDate);

        builder.OwnsOne(b => b.Dimensions, d =>
        {
            d.Property(x => x.WeightGrams).HasColumnName("WeightGrams").IsRequired();
            d.Property(x => x.HeightMm).HasColumnName("HeightMm").IsRequired();
            d.Property(x => x.WidthMm).HasColumnName("WidthMm").IsRequired();
            d.Property(x => x.DepthMm).HasColumnName("DepthMm").IsRequired();
        });
        builder.Navigation(b => b.Dimensions).IsRequired();

        builder.OwnsOne(b => b.Price, price =>
        {
            price.Property(m => m.Amount).HasColumnName("Price").HasColumnType("decimal(18,2)").IsRequired();
            price.Property(m => m.Currency).HasColumnName("Currency").HasMaxLength(3).IsRequired();
        });
        builder.Navigation(b => b.Price).IsRequired();

        builder.Property(b => b.StockQuantity).IsRequired();
        builder.Property(b => b.ReservedQuantity).IsRequired();
        builder.Property(b => b.IsActive).IsRequired();
        builder.Property(b => b.RowVersion).IsRowVersion();

        builder.Property(b => b.LowStockThreshold).IsRequired();
        builder.Property(b => b.LowStockAlertedAtUtc);


        builder.HasIndex(b => b.Isbn).IsUnique().HasFilter("[Isbn] IS NOT NULL AND [Isbn] <> ''");

        builder.OwnsMany(b => b.Images, image =>
        {
            image.ToTable("BookImages");
            image.WithOwner().HasForeignKey("BookId");
            image.HasKey(i => i.Id);

            image.Property(i => i.StorageKey).HasMaxLength(500).IsRequired();
            image.Property(i => i.AltText).HasMaxLength(300).IsRequired();
            image.Property(i => i.DisplayOrder).IsRequired();
            image.Property(i => i.IsCover).IsRequired();

            image.HasIndex("BookId", nameof(BookImage.DisplayOrder));
        });

        builder.Metadata.FindNavigation(nameof(Book.Images))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        // Computed helper, not a second relationship — EF would otherwise try to
        // map it as another navigation to BookImage.
        builder.Ignore(b => b.OrderedImages);
        builder.Ignore(b => b.CoverImage);

        builder.Property(b => b.CategoryId);
        builder.HasIndex(b => b.CategoryId);

        // Restrict: a category in use can't be deleted, even by direct SQL.
        builder.HasOne<Category>().WithMany().HasForeignKey(b => b.CategoryId).OnDelete(DeleteBehavior.Restrict);

        builder.OwnsMany(b => b.Muhaqqiqs, link =>
        {
            link.ToTable("BookMuhaqqiqs");
            link.WithOwner().HasForeignKey("BookId");
            link.HasKey("BookId", nameof(BookMuhaqqiq.MuhaqqiqId));

            link.Property(l => l.DisplayOrder).IsRequired();

            link.HasOne<Muhaqqiq>().WithMany().HasForeignKey(l => l.MuhaqqiqId).OnDelete(DeleteBehavior.Restrict);

            // "Every book by this muhaqqiq" and works counts.
            link.HasIndex(l => l.MuhaqqiqId);
        });

        builder.Metadata.FindNavigation(nameof(Book.Muhaqqiqs))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        // Computed from Muhaqqiqs; EF must not try to map it as a column.
        builder.Ignore(b => b.OrderedMuhaqqiqIds);

        builder.Property(b => b.Level).HasConversion<string>().HasMaxLength(20);
        builder.Property(b => b.Volumes);
        builder.Property(b => b.CompareAtPrice).HasColumnType("decimal(18,2)");
        builder.Property(b => b.InstallmentsAllowed).IsRequired();
        builder.Property(b => b.Badges).IsRequired(); // [Flags] int: New | Deluxe | Bestseller
        builder.Property(b => b.EditionLabel).HasMaxLength(Book.MaxEditionLabelLength);

        builder.PrimitiveCollection(b => b.Highlights)
            .HasField("_highlights")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.Property(b => b.EditionGroupId);
        builder.HasIndex(b => b.EditionGroupId);

        builder.OwnsMany(b => b.Related, relation =>
        {
            relation.ToTable("BookRelations");
            relation.WithOwner().HasForeignKey("BookId");
            relation.HasKey("BookId", nameof(BookRelation.RelatedBookId));
            relation.Property(r => r.DisplayOrder).IsRequired();
        });

        builder.Metadata.FindNavigation(nameof(Book.Related))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        // Computed on the domain object: EF must not map them.
        builder.Ignore(b => b.OrderedRelatedBookIds);
        builder.Ignore(b => b.SavingsAmount);
        builder.Ignore(b => b.SavingsPercent);

        builder.Property(b => b.SearchTitle).HasMaxLength(1000).IsRequired();
        builder.Property(b => b.SearchText).IsRequired(); // nvarchar(max): title + highlights can be long

        // Every search starts from active books; price sorts and filters are common.
        builder.HasIndex(b => new { b.IsActive, b.CategoryId });
        builder.HasIndex(b => new { b.IsActive, b.Id });
    }
}