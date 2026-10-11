using BookStore.Domain.Loyalty;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class LoyaltyTransactionConfiguration : IEntityTypeConfiguration<LoyaltyTransaction>
{
    public void Configure(EntityTypeBuilder<LoyaltyTransaction> builder)
    {
        builder.ToTable("LoyaltyTransactions");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Type).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(t => t.ReferenceKey).HasMaxLength(100).IsRequired();
        builder.Property(t => t.OrderNumber).HasMaxLength(50);
        builder.Property(t => t.Note).HasMaxLength(LoyaltyTransaction.MaxNoteLength);

        // The guarantee behind "awarded exactly once", whatever retries happen.
        builder.HasIndex(t => new { t.CustomerId, t.Type, t.ReferenceKey }).IsUnique();

        // Balance, tier window and history.
        builder.HasIndex(t => new { t.CustomerId, t.CreatedAtUtc });

        builder.Ignore(t => t.DomainEvents);
    }
}