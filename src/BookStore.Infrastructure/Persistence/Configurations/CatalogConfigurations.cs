using BookStore.Domain.Books;
using BookStore.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categories");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name).HasMaxLength(Category.MaxNameLength).IsRequired();
        builder.Property(c => c.Slug)
            .HasConversion(slug => slug.Value, value => Slug.Create(value))
            .HasMaxLength(Slug.MaxLength)
            .IsRequired();
        builder.HasIndex(c => c.Slug).IsUnique();

        // A single visible letter can be several UTF-16 code units.
        builder.Property(c => c.Letter).HasMaxLength(8);
        builder.Property(c => c.Description).HasMaxLength(Category.MaxDescriptionLength);

        // Self-reference without navigations. Restrict: a parent with
        // children can never be deleted, even by direct SQL.
        builder.HasOne<Category>().WithMany().HasForeignKey(c => c.ParentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(c => new { c.ParentId, c.DisplayOrder });

        builder.Ignore(c => c.IsTopLevel);
        builder.Ignore(c => c.DomainEvents);
    }
}

public sealed class MuhaqqiqConfiguration : IEntityTypeConfiguration<Muhaqqiq>
{
    public void Configure(EntityTypeBuilder<Muhaqqiq> builder)
    {
        builder.ToTable("Muhaqqiqs");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Name).HasMaxLength(Muhaqqiq.MaxNameLength).IsRequired();
        builder.Property(m => m.Slug)
            .HasConversion(slug => slug.Value, value => Slug.Create(value))
            .HasMaxLength(Slug.MaxLength)
            .IsRequired();
        builder.HasIndex(m => m.Slug).IsUnique();

        builder.Property(m => m.Bio).HasMaxLength(Muhaqqiq.MaxBioLength);

        builder.PrimitiveCollection(m => m.Specialties)
            .HasField("_specialties")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasIndex(m => new { m.IsFeatured, m.DisplayOrder });

        builder.Ignore(m => m.DomainEvents);
    }
}