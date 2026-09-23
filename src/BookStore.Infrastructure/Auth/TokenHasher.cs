using System.Security.Cryptography;
using System.Text;
using BookStore.Application.Abstractions.Auth;

namespace BookStore.Infrastructure.Auth;

public sealed class TokenHasher : ITokenHasher
{
    public GeneratedToken Generate()
    {
        // 32 bytes of CSPRNG output, base64url-encoded so it's safe in a
        // URL query string without escaping.
        var bytes = RandomNumberGenerator.GetBytes(32);
        var plain = WebEncoders.Base64UrlEncode(bytes);

        return new GeneratedToken(plain, Hash(plain));
    }

    /// SHA-256, not PBKDF2. These tokens are already 256 bits of randomness,
    /// so there's nothing to brute-force; the hash exists only so a leaked
    /// database doesn't hand over working tokens.
    public string Hash(string plainToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(plainToken)));

    private static class WebEncoders
    {
        public static string Base64UrlEncode(byte[] input) =>
            Convert.ToBase64String(input).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}