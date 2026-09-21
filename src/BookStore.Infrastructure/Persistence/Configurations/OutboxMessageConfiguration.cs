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

        // The background worker polls unprocessed rows constantly — this
        // index is what keeps that query cheap as the table grows.
        builder.HasIndex(m => m.ProcessedOnUtc);
    }
}