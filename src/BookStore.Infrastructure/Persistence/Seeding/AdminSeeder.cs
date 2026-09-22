using BookStore.Application.Abstractions.Auth;
using BookStore.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BookStore.Infrastructure.Persistence.Seeding;

public static class AdminSeeder
{
    /// Creates the first admin from config, only if no admin exists yet.
    /// Runs on every startup but does nothing after the first success.
    public static async Task SeedInitialAdminAsync(this IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<BookStoreDbContext>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("AdminSeeder");

        if (await db.AdminUsers.AnyAsync(ct))
            return;

        var email = config["AdminSeed:Email"];
        var password = config["AdminSeed:Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning(
                "No admin account exists and AdminSeed:Email / AdminSeed:Password are not configured. " +
                "The admin panel is unreachable until one is created.");
            return;
        }

        if (password.Length < 5)
            throw new InvalidOperationException("AdminSeed:Password must be at least 12 characters.");

        db.AdminUsers.Add(AdminUser.Create(email, hasher.Hash(password)));
        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Seeded initial admin {Email}. Remove AdminSeed:Password from your secrets now.", email);
    }
}