using BookStore.Domain.Library;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class LibraryEntryConfiguration : IEntityTypeConfiguration<LibraryEntry>
{
    public void Configure(EntityTypeBuilder<LibraryEntry> builder)
    {
        builder.ToTable("LibraryEntries", t =>
            t.HasCheckConstraint("CK_LibraryEntries_Progress", "[ProgressPercent] BETWEEN 0 AND 100"));

        builder.HasKey(e => e.Id);
        builder.Property(e => e.ReadingStatus).HasConversion<string>().HasMaxLength(20).IsRequired();

        // One entry per customer and book.
        builder.HasIndex(e => new { e.CustomerId, e.BookId }).IsUnique();

        builder.Ignore(e => e.IsEmpty);
        builder.Ignore(e => e.DomainEvents);
    }
}