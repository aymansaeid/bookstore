using BookStore.Domain.Inventory;
using BookStore.Infrastructure.Persistence.Auditing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class StockMovementConfiguration : IEntityTypeConfiguration<StockMovement>
{
    public void Configure(EntityTypeBuilder<StockMovement> builder)
    {
        builder.ToTable("StockMovements");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.BookId).IsRequired();
        builder.Property(m => m.QuantityDelta).IsRequired();
        builder.Property(m => m.Reason).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(m => m.Note).HasMaxLength(500);
        builder.Property(m => m.OccurredAtUtc).IsRequired();

        builder.HasIndex(m => new { m.BookId, m.OccurredAtUtc });
        builder.HasIndex(m => m.OrderId);

        builder.Ignore(m => m.DomainEvents);
    }
}

public sealed class AuditLogEntryConfiguration : IEntityTypeConfiguration<AuditLogEntry>
{
    public void Configure(EntityTypeBuilder<AuditLogEntry> builder)
    {
        builder.ToTable("AuditLog");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ActorName).HasMaxLength(320).IsRequired();
        builder.Property(e => e.Action).HasMaxLength(100).IsRequired();
        builder.Property(e => e.EntityType).HasMaxLength(100).IsRequired();
        builder.Property(e => e.EntityId).HasMaxLength(200);
        builder.Property(e => e.DetailsJson).HasMaxLength(4000).IsRequired();

        builder.HasIndex(e => new { e.EntityType, e.EntityId });
        builder.HasIndex(e => e.AdminUserId);
        builder.HasIndex(e => e.OccurredAtUtc);
    }
}