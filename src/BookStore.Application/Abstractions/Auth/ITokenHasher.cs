namespace BookStore.Application.Abstractions.Auth;

public sealed record GeneratedToken(string PlainToken, string TokenHash);

public interface ITokenHasher
{
    /// Cryptographically random, URL-safe. Returns both the plaintext (sent
    /// by email or cookie, never stored) and the hash (stored, never sent).
    GeneratedToken Generate();

    string Hash(string plainToken);
}