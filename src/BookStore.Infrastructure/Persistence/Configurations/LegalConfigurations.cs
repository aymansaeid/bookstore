using BookStore.Domain.Legal;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class LegalDocumentConfiguration : IEntityTypeConfiguration<LegalDocument>
{
    public void Configure(EntityTypeBuilder<LegalDocument> builder)
    {
        builder.ToTable("LegalDocuments");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.Type).HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(d => d.Language).HasMaxLength(5).IsRequired();
        builder.Property(d => d.Version).HasMaxLength(50).IsRequired();
        builder.Property(d => d.Title).HasMaxLength(LegalDocument.MaxTitleLength).IsRequired();
        builder.Property(d => d.BodyMarkdown).IsRequired();
        builder.Property(d => d.Status).HasConversion<string>().HasMaxLength(20).IsRequired();

        builder.HasIndex(d => new { d.Type, d.Language, d.Version }).IsUnique();

        // The database itself guarantees at most ONE live version per type
        // and language, whatever happens in the application.
        builder.HasIndex(d => new { d.Type, d.Language })
            .IsUnique()
            .HasFilter("[Status] = 'Published'");

        builder.Ignore(d => d.DomainEvents);
    }
}

public sealed class OrderLegalRecordConfiguration : IEntityTypeConfiguration<OrderLegalRecord>
{
    public void Configure(EntityTypeBuilder<OrderLegalRecord> builder)
    {
        builder.ToTable("OrderLegalRecords");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.OrderNumber).HasMaxLength(50).IsRequired();
        builder.Property(r => r.DocumentType).HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(r => r.Language).HasMaxLength(5).IsRequired();
        builder.Property(r => r.Version).HasMaxLength(50).IsRequired();
        builder.Property(r => r.Title).HasMaxLength(LegalDocument.MaxTitleLength).IsRequired();
        builder.Property(r => r.RenderedHtml).IsRequired();
        builder.Property(r => r.ContentSha256).HasMaxLength(64).IsRequired();

        builder.HasIndex(r => r.OrderNumber);

        builder.Ignore(r => r.DomainEvents);
    }
}