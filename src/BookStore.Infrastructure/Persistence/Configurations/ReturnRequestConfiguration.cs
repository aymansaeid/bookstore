using BookStore.Domain.Returns;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class ReturnRequestConfiguration : IEntityTypeConfiguration<ReturnRequest>
{
    public void Configure(EntityTypeBuilder<ReturnRequest> builder)
    {
        builder.ToTable("ReturnRequests");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.OrderNumber).HasMaxLength(50).IsRequired();
        builder.Property(r => r.CustomerEmail).HasMaxLength(320).IsRequired();
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(r => r.Reason).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(r => r.CustomerComment).HasMaxLength(ReturnRequest.MaxCommentLength);
        builder.Property(r => r.RefundReference).HasMaxLength(200);
        builder.Property(r => r.ReturnInstructions).HasMaxLength(2000);
        builder.Property(r => r.RejectionReason).HasMaxLength(1000);
        builder.Property(r => r.RowVersion).IsRowVersion();

        builder.OwnsOne(r => r.RefundAmount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("RefundAmount").HasColumnType("decimal(18,2)").IsRequired();
            money.Property(m => m.Currency).HasColumnName("RefundCurrency").HasMaxLength(3).IsRequired();
        });
        builder.Navigation(r => r.RefundAmount).IsRequired();

        // The real guarantee behind "one return per order": at most one row
        // per order in a blocking state. Rejected and cancelled requests
        // don't count, so the customer can try again after those.
        builder.HasIndex(r => r.OrderId)
            .IsUnique()
            .HasFilter("[Status] IN ('Requested', 'Approved', 'Completed')");

        builder.HasIndex(r => new { r.Status, r.RequestedAtUtc });

        builder.OwnsMany(r => r.Lines, line =>
        {
            line.ToTable("ReturnLines");
            line.WithOwner().HasForeignKey("ReturnRequestId");
            line.HasKey(l => l.Id);

            line.Property(l => l.BookTitleSnapshot).HasMaxLength(500).IsRequired();
            line.Property(l => l.ReceivedCondition).HasConversion<string>().HasMaxLength(20);
        });

        builder.Metadata.FindNavigation(nameof(ReturnRequest.Lines))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.Ignore(r => r.DomainEvents);
    }
}