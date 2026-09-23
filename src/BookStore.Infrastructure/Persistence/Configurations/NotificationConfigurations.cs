using BookStore.Domain.Notifications;
using BookStore.Domain.Wishlists;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class StockNotificationConfiguration : IEntityTypeConfiguration<StockNotification>
{
    public void Configure(EntityTypeBuilder<StockNotification> builder)
    {
        builder.ToTable("StockNotifications");
        builder.HasKey(n => n.Id);

        builder.Property(n => n.Email).HasMaxLength(320).IsRequired();
        builder.Property(n => n.ConfirmationTokenHash).HasMaxLength(64).IsRequired();
        builder.HasIndex(n => n.ConfirmationTokenHash);

        // One subscription per (book, email): re-subscribing updates the
        // existing row rather than piling up duplicates.
        builder.HasIndex(n => new { n.BookId, n.Email }).IsUnique();

        // Matches the worker's "who's waiting for this book" query.
        builder.HasIndex(n => new { n.BookId, n.IsConfirmed, n.NotifiedAtUtc });

        builder.Ignore(n => n.IsAwaitingNotification);
        builder.Ignore(n => n.DomainEvents);
    }
}

public sealed class WishlistItemConfiguration : IEntityTypeConfiguration<WishlistItem>
{
    public void Configure(EntityTypeBuilder<WishlistItem> builder)
    {
        builder.ToTable("WishlistItems");
        builder.HasKey(w => w.Id);

        builder.HasIndex(w => new { w.CustomerId, w.BookId }).IsUnique();
        builder.HasIndex(w => w.CustomerId);

        builder.Ignore(w => w.DomainEvents);
    }
}