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

        builder.OwnsMany(c => c.Translations, t =>
        {
            t.ToTable("CategoryTranslations");
            t.WithOwner().HasForeignKey("CategoryId");
            t.Property(x => x.Language).HasConversion<string>().HasMaxLength(5);
            t.HasKey("CategoryId", nameof(CategoryTranslation.Language));
            t.Property(x => x.Name).HasMaxLength(Category.MaxNameLength).IsRequired();
            t.Property(x => x.Description).HasMaxLength(Category.MaxDescriptionLength);
        });

        builder.Metadata.FindNavigation(nameof(Category.Translations))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.Ignore(c => c.TranslatedLanguages);

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

        builder.OwnsMany(m => m.Translations, t =>
        {
            t.ToTable("MuhaqqiqTranslations");
            t.WithOwner().HasForeignKey("MuhaqqiqId");
            t.Property(x => x.Language).HasConversion<string>().HasMaxLength(5);
            t.HasKey("MuhaqqiqId", nameof(MuhaqqiqTranslation.Language));
            t.Property(x => x.Name).HasMaxLength(Muhaqqiq.MaxNameLength).IsRequired();
            t.Property(x => x.Bio).HasMaxLength(Muhaqqiq.MaxBioLength);

            t.PrimitiveCollection(x => x.Specialties)
                .HasField("_specialties")
                .UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        builder.Metadata.FindNavigation(nameof(Muhaqqiq.Translations))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.Ignore(m => m.TranslatedLanguages);

        builder.HasIndex(m => new { m.IsFeatured, m.DisplayOrder });

        builder.Ignore(m => m.DomainEvents);
    }
}