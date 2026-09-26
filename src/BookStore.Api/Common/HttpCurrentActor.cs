using System.Security.Claims;
using BookStore.Application.Abstractions;
using BookStore.Domain.Users;
using Microsoft.IdentityModel.JsonWebTokens;

namespace BookStore.Api.Common;

public sealed class HttpCurrentActor(IHttpContextAccessor accessor) : ICurrentActor
{
    private ClaimsPrincipal? User => accessor.HttpContext?.User;

    // Customer tokens never carry the Admin role, and background jobs have
    // no HttpContext at all; both correctly fall through to "System".
    private bool IsAdmin => User?.IsInRole(nameof(AdminRole.Admin)) == true;

    public int? AdminUserId =>
        IsAdmin && int.TryParse(User!.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id) ? id : null;

    public string DisplayName =>
        IsAdmin ? User!.FindFirstValue(JwtRegisteredClaimNames.Email) ?? "Admin" : "System";
}