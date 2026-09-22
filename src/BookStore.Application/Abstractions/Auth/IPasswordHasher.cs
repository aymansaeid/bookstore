namespace BookStore.Application.Abstractions.Auth;

public enum PasswordVerification
{
    Failed = 0,
    Success = 1,
    SuccessRehashNeeded = 2
}

public interface IPasswordHasher
{
    string Hash(string password);

    /// passwordHash may be null (user not found). Implementations must still
    /// do a full hash comparison in that case, so a missing user takes the
    /// same time to reject as a wrong password.
    PasswordVerification Verify(string? passwordHash, string password);
}