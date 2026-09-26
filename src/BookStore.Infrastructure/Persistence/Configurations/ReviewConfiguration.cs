using BookStore.Domain.Reviews;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable("Reviews", t =>
            t.HasCheckConstraint("CK_Reviews_RatingRange", "[Rating] BETWEEN 1 AND 5"));

        builder.HasKey(r => r.Id);

        builder.Property(r => r.AuthorDisplayName).HasMaxLength(120).IsRequired();
        builder.Property(r => r.Title).HasMaxLength(Review.MaxTitleLength);
        builder.Property(r => r.Body).HasMaxLength(Review.MaxBodyLength).IsRequired();
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(r => r.ModerationNote).HasMaxLength(500);

        // The real guarantee behind "one review per customer per book".
        builder.HasIndex(r => new { r.CustomerId, r.BookId }).IsUnique();

        // Public listing: approved reviews for a book, newest first.
        builder.HasIndex(r => new { r.BookId, r.Status, r.CreatedAtUtc });

        // Moderation queue.
        builder.HasIndex(r => new { r.Status, r.CreatedAtUtc });

        builder.Ignore(r => r.DomainEvents);
    }
}