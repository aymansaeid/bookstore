using System.Text;
using BookStore.Application.Abstractions.Auth;
using BookStore.Domain.Customers;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace BookStore.Infrastructure.Auth;

public sealed class CustomerTokenGenerator(IOptions<CustomerJwtOptions> options) : ICustomerTokenGenerator
{
    public const string CustomerScheme = "CustomerBearer";

    private readonly CustomerJwtOptions _options = options.Value;
    private readonly JsonWebTokenHandler _handler = new();

    public AccessToken Generate(Customer customer)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_options.ExpiryMinutes);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Expires = expiresAt.UtcDateTime,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
            Claims = new Dictionary<string, object>
            {
                [JwtRegisteredClaimNames.Sub] = customer.Id.ToString(),
                [JwtRegisteredClaimNames.Email] = customer.Email,
                [JwtRegisteredClaimNames.Jti] = Guid.NewGuid().ToString()
            }
        };

        return new AccessToken(_handler.CreateToken(descriptor), expiresAt);
    }
}