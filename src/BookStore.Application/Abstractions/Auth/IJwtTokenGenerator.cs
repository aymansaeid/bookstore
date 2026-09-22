using BookStore.Domain.Users;

namespace BookStore.Application.Abstractions.Auth;

public sealed record AccessToken(string Token, DateTimeOffset ExpiresAtUtc);

public interface IJwtTokenGenerator
{
    AccessToken Generate(AdminUser user);
}