using BookStore.Domain.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookStore.Infrastructure.Persistence.Configurations;

public sealed class SecurityTokenConfiguration : IEntityTypeConfiguration<SecurityToken>
{
    public void Configure(EntityTypeBuilder<SecurityToken> builder)
    {
        builder.ToTable("SecurityTokens");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.TokenHash).HasMaxLength(64).IsRequired();
        builder.HasIndex(t => new { t.TokenHash, t.Purpose });

        builder.Property(t => t.Purpose).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(t => t.CustomerId).IsRequired();

        builder.HasIndex(t => new { t.CustomerId, t.Purpose });

        builder.Ignore(t => t.IsUsed);
        builder.Ignore(t => t.IsExpired);
        builder.Ignore(t => t.IsUsable);
        builder.Ignore(t => t.DomainEvents);
    }
}

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.TokenHash).HasMaxLength(64).IsRequired();
        builder.HasIndex(t => t.TokenHash).IsUnique();

        builder.Property(t => t.FamilyId).IsRequired();
        builder.HasIndex(t => t.FamilyId);
        builder.HasIndex(t => t.CustomerId);

        builder.Property(t => t.RevokedReason).HasMaxLength(200);

        builder.Ignore(t => t.IsUsed);
        builder.Ignore(t => t.IsRevoked);
        builder.Ignore(t => t.IsExpired);
        builder.Ignore(t => t.IsUsable);
        builder.Ignore(t => t.DomainEvents);
    }
}