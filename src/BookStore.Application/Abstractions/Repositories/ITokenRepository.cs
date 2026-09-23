using BookStore.Domain.Auth;

namespace BookStore.Application.Abstractions.Repositories;

public interface ISecurityTokenRepository
{
    Task<SecurityToken?> GetUsableAsync(string tokenHash, SecurityTokenPurpose purpose, CancellationToken ct = default);
    Task InvalidateAllAsync(int customerId, SecurityTokenPurpose purpose, CancellationToken ct = default);
    void Add(SecurityToken token);
}

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken ct = default);
    Task RevokeFamilyAsync(Guid familyId, string reason, CancellationToken ct = default);
    Task RevokeAllForCustomerAsync(int customerId, string reason, CancellationToken ct = default);
    void Add(RefreshToken token);
}