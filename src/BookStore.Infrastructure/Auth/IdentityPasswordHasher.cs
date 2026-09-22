using BookStore.Application.Abstractions.Auth;
using BookStore.Domain.Users;
using Microsoft.AspNetCore.Identity;

namespace BookStore.Infrastructure.Auth;

/// Wraps ASP.NET Core Identity's PBKDF2 hasher — just the hasher, none of
/// the rest of Identity.
public sealed class IdentityPasswordHasher : IPasswordHasher
{
    private readonly PasswordHasher<AdminUser> _inner = new();

    // A real hash of a throwaway value, computed once. Verifying against it
    // costs the same as verifying a real user's hash, which is the whole
    // point. It can never "succeed" for a missing user because we return
    // Failed regardless when the input hash was null.
    private static readonly string DummyHash =
        new PasswordHasher<AdminUser>().HashPassword(null!, Guid.NewGuid().ToString());

    public string Hash(string password) => _inner.HashPassword(null!, password);

    public PasswordVerification Verify(string? passwordHash, string password)
    {
        // Identity's hasher ignores the user argument; null! is safe here.
        var result = _inner.VerifyHashedPassword(null!, passwordHash ?? DummyHash, password);

        if (passwordHash is null)
            return PasswordVerification.Failed;

        return result switch
        {
            PasswordVerificationResult.Success => PasswordVerification.Success,
            PasswordVerificationResult.SuccessRehashNeeded => PasswordVerification.SuccessRehashNeeded,
            _ => PasswordVerification.Failed
        };
    }
}