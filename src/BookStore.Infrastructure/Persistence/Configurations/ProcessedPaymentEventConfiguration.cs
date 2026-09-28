using BookStore.Infrastructure.Persistence.Payments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class ProcessedPaymentEventConfiguration : IEntityTypeConfiguration<ProcessedPaymentEvent>
{
    public void Configure(EntityTypeBuilder<ProcessedPaymentEvent> builder)
    {
        builder.ToTable("ProcessedPaymentEvents");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.EventId).HasMaxLength(255).IsRequired();

        // The line that makes payment confirmation idempotent.
        builder.HasIndex(e => e.EventId).IsUnique();

        builder.Property(e => e.EventType).HasMaxLength(100).IsRequired();
    }
}