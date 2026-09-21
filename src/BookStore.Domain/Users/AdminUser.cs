using BookStore.Domain.Common;

namespace BookStore.Domain.Users;

public enum AdminRole
{
    Admin = 0
    // Add more (Staff, SuperAdmin...) when you actually need them —
    // don't pre-build a permission system for a single-admin store.
}

public sealed class AdminUser : AggregateRoot<int>
{
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public AdminRole Role { get; private set; }
    public bool IsActive { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? LastLoginAtUtc { get; private set; }

    private AdminUser() { } // EF Core

    private AdminUser(string email, string passwordHash, AdminRole role)
    {
        Email = email;
        PasswordHash = passwordHash;
        Role = role;
        IsActive = true;
        CreatedAtUtc = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// passwordHash must already be hashed (BCrypt/Argon2, via an
    /// IPasswordHasher implemented in Infrastructure). Domain never sees
    /// a plaintext password and never depends on a hashing library —
    /// that dependency belongs in Infrastructure, not here.
    /// </summary>
    public static AdminUser Create(string email, string passwordHash, AdminRole role = AdminRole.Admin)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new ArgumentException("A valid email is required.", nameof(email));
        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("Password hash is required.", nameof(passwordHash));

        return new AdminUser(email.Trim().ToLowerInvariant(), passwordHash, role);
    }

    public void ChangePasswordHash(string newPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(newPasswordHash))
            throw new ArgumentException("Password hash is required.", nameof(newPasswordHash));

        PasswordHash = newPasswordHash;
    }

    public void RecordLogin() => LastLoginAtUtc = DateTimeOffset.UtcNow;

    public void Deactivate()
    {
        if (!IsActive)
            throw new InvalidOperationException($"Admin user '{Email}' is already inactive.");

        IsActive = false;
    }

    public void Activate() => IsActive = true;
}