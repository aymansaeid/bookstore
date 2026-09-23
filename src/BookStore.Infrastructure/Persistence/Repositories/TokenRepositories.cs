using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Auth;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class SecurityTokenRepository(BookStoreDbContext dbContext) : ISecurityTokenRepository
{
    public async Task<SecurityToken?> GetUsableAsync(
        string tokenHash, SecurityTokenPurpose purpose, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;

        return await dbContext.SecurityTokens.FirstOrDefaultAsync(
            t => t.TokenHash == tokenHash && t.Purpose == purpose && t.UsedAtUtc == null && t.ExpiresAtUtc > now, ct);
    }

    /// Burns outstanding tokens by marking them used, so requesting a new
    /// reset link immediately kills the previous one.
    public async Task InvalidateAllAsync(int customerId, SecurityTokenPurpose purpose, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;

        await dbContext.SecurityTokens
            .Where(t => t.CustomerId == customerId && t.Purpose == purpose && t.UsedAtUtc == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.UsedAtUtc, now), ct);
    }

    public void Add(SecurityToken token) => dbContext.SecurityTokens.Add(token);
}

public sealed class RefreshTokenRepository(BookStoreDbContext dbContext) : IRefreshTokenRepository
{
    public Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken ct = default) =>
        dbContext.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

    public async Task RevokeFamilyAsync(Guid familyId, string reason, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;

        await dbContext.RefreshTokens
            .Where(t => t.FamilyId == familyId && t.RevokedAtUtc == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(t => t.RevokedAtUtc, now)
                .SetProperty(t => t.RevokedReason, reason), ct);
    }

    public async Task RevokeAllForCustomerAsync(int customerId, string reason, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;

        await dbContext.RefreshTokens
            .Where(t => t.CustomerId == customerId && t.RevokedAtUtc == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(t => t.RevokedAtUtc, now)
                .SetProperty(t => t.RevokedReason, reason), ct);
    }

    public void Add(RefreshToken token) => dbContext.RefreshTokens.Add(token);
}