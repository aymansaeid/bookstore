using BookStore.Domain.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");
        builder.HasKey(n => n.Id);

        builder.Property(n => n.Type).HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(n => n.DedupKey).HasMaxLength(Notification.MaxDedupKeyLength).IsRequired();
        builder.Property(n => n.BookTitle).HasMaxLength(500);
        builder.Property(n => n.BookSlug).HasMaxLength(200);
        builder.Property(n => n.OrderNumber).HasMaxLength(50);
        builder.Property(n => n.MuhaqqiqName).HasMaxLength(200);
        builder.Property(n => n.MuhaqqiqSlug).HasMaxLength(200);
        builder.Property(n => n.OldPrice).HasColumnType("decimal(18,2)");
        builder.Property(n => n.NewPrice).HasColumnType("decimal(18,2)");
        builder.Property(n => n.Currency).HasMaxLength(3);

        // The guarantee behind "never notified twice", whatever retries happen.
        builder.HasIndex(n => new { n.CustomerId, n.DedupKey }).IsUnique();

        // The bell's unread count and the newest-first list.
        builder.HasIndex(n => new { n.CustomerId, n.ReadAtUtc });
        builder.HasIndex(n => new { n.CustomerId, n.CreatedAtUtc });

        builder.Ignore(n => n.IsRead);
        builder.Ignore(n => n.DomainEvents);
    }
}

public sealed class MuhaqqiqFollowConfiguration : IEntityTypeConfiguration<MuhaqqiqFollow>
{
    public void Configure(EntityTypeBuilder<MuhaqqiqFollow> builder)
    {
        builder.ToTable("MuhaqqiqFollows");
        builder.HasKey(f => f.Id);

        builder.HasIndex(f => new { f.CustomerId, f.MuhaqqiqId }).IsUnique();
        builder.HasIndex(f => f.MuhaqqiqId); // "all followers of X" for the fan-out

        builder.Ignore(f => f.DomainEvents);
    }
}