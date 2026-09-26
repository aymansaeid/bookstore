using BookStore.Domain.Users;

namespace BookStore.Application.Abstractions.Repositories;

public interface IAdminUserRepository
{
    Task<AdminUser?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
    void Add(AdminUser adminUser);
    Task<AdminUser?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<string>> ListActiveEmailsAsync(CancellationToken ct = default);
}