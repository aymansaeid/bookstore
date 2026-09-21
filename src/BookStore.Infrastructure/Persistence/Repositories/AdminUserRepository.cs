using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class AdminUserRepository(BookStoreDbContext dbContext) : IAdminUserRepository
{
    public Task<AdminUser?> GetByEmailAsync(string email, CancellationToken ct = default) =>
        dbContext.AdminUsers.FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant(), ct);

    public Task<bool> EmailExistsAsync(string email, CancellationToken ct = default) =>
        dbContext.AdminUsers.AnyAsync(u => u.Email == email.ToLowerInvariant(), ct);

    public void Add(AdminUser adminUser) => dbContext.AdminUsers.Add(adminUser);
}