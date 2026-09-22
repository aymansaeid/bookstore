using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;

namespace BookStore.Application.Auth.Queries;

public sealed record AdminProfileDto(int Id, string Email, string Role, DateTimeOffset CreatedAtUtc, DateTimeOffset? LastLoginAtUtc);

public sealed record GetCurrentAdminQuery(int AdminUserId) : IQuery<AdminProfileDto>;

public sealed class GetCurrentAdminQueryHandler(IAdminUserRepository adminUserRepository)
    : IQueryHandler<GetCurrentAdminQuery, AdminProfileDto>
{
    public async Task<Result<AdminProfileDto>> Handle(GetCurrentAdminQuery query, CancellationToken ct)
    {
        var user = await adminUserRepository.GetByIdAsync(query.AdminUserId, ct);

        // A still-valid token for a since-deactivated account: refuse. The
        // admin frontend calls this on load, so a deactivated admin gets
        // kicked out immediately instead of at token expiry.
        if (user is null || !user.IsActive)
            return Result.Failure<AdminProfileDto>(AuthErrors.AccountUnavailable);

        return Result.Success(new AdminProfileDto(
            user.Id, user.Email, user.Role.ToString(), user.CreatedAtUtc, user.LastLoginAtUtc));
    }
}