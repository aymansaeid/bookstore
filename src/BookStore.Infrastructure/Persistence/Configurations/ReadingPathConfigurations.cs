using BookStore.Domain.Books;
using BookStore.Domain.ReadingPaths;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class ReadingPathConfiguration : IEntityTypeConfiguration<ReadingPath>
{
    public void Configure(EntityTypeBuilder<ReadingPath> builder)
    {
        builder.ToTable("ReadingPaths", t =>
            t.HasCheckConstraint("CK_ReadingPaths_Discount", $"[DiscountPercentage] BETWEEN 0 AND {ReadingPath.MaxDiscountPercentage}"));

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Title).HasMaxLength(ReadingPath.MaxTitleLength).IsRequired();
        builder.Property(p => p.Slug)
            .HasConversion(slug => slug.Value, value => Slug.Create(value))
            .HasMaxLength(Slug.MaxLength)
            .IsRequired();
        builder.HasIndex(p => p.Slug).IsUnique();
        builder.Property(p => p.Description).HasMaxLength(ReadingPath.MaxDescriptionLength);
        builder.Property(p => p.Level).HasConversion<string>().HasMaxLength(20).IsRequired();

        builder.OwnsMany(p => p.Stages, stage =>
        {
            stage.ToTable("ReadingPathStages");
            stage.WithOwner().HasForeignKey("ReadingPathId");
            stage.HasKey(s => s.Id);
            stage.Property(s => s.Reason).HasMaxLength(ReadingPath.MaxReasonLength).IsRequired();

            // A book used in a path can't be deleted underneath it.
            stage.HasOne<Book>().WithMany().HasForeignKey(s => s.BookId).OnDelete(DeleteBehavior.Restrict);
            stage.HasIndex(s => s.BookId);
        });

        builder.Metadata.FindNavigation(nameof(ReadingPath.Stages))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.Ignore(p => p.OrderedStages);
        builder.Ignore(p => p.DomainEvents);
    }
}

public sealed class PathEnrollmentConfiguration : IEntityTypeConfiguration<PathEnrollment>
{
    public void Configure(EntityTypeBuilder<PathEnrollment> builder)
    {
        builder.ToTable("PathEnrollments");
        builder.HasKey(e => e.Id);
        builder.HasIndex(e => new { e.CustomerId, e.ReadingPathId }).IsUnique();
        builder.HasIndex(e => e.ReadingPathId);

        builder.HasOne<ReadingPath>().WithMany().HasForeignKey(e => e.ReadingPathId).OnDelete(DeleteBehavior.Restrict);

        builder.Ignore(e => e.DomainEvents);
    }
}