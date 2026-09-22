using BookStore.Infrastructure.Persistence.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class OutboxMessageConfiguration : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.ToTable("OutboxMessages");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Type).HasMaxLength(200).IsRequired();
        builder.Property(m => m.PayloadJson).IsRequired();
        builder.Property(m => m.Error).HasMaxLength(2000);
        builder.Property(m => m.RetryCount).IsRequired();
        builder.Property(m => m.NextAttemptAtUtc).IsRequired();
        builder.Property(m => m.IsDeadLettered).IsRequired();

        // Exactly matches the worker's polling predicate, so the query stays
        // an index seek as the table grows.
        builder.HasIndex(m => new { m.ProcessedOnUtc, m.IsDeadLettered, m.NextAttemptAtUtc });
    }
}