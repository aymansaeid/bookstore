using BookStore.Infrastructure.Persistence.Webhooks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class ProcessedWebhookConfiguration : IEntityTypeConfiguration<ProcessedWebhook>
{
    public void Configure(EntityTypeBuilder<ProcessedWebhook> builder)
    {
        builder.ToTable("ProcessedWebhooks");
        builder.HasKey(w => w.Id);
        builder.Property(w => w.StripeEventId).HasMaxLength(255).IsRequired();

        // THE line that makes Stripe webhook handling idempotent. Everything
        // else in this class is bookkeeping.
        builder.HasIndex(w => w.StripeEventId).IsUnique();

        builder.Property(w => w.EventType).HasMaxLength(200).IsRequired();
    }
}