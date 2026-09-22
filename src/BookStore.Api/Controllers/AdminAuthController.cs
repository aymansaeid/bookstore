using System.Security.Claims;
using BookStore.Api.Common;
using BookStore.Application.Auth.Commands;
using BookStore.Application.Auth.Queries;
using BookStore.Domain.Users;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.JsonWebTokens;

namespace BookStore.Api.Controllers;

public sealed record LoginRequest(string Email, string Password);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

[ApiController]
[Route("api/admin/auth")]
[Authorize(Roles = nameof(AdminRole.Admin))]
public sealed class AdminAuthController(ISender sender) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct) =>
        (await sender.Send(new LoginCommand(request.Email, request.Password), ct)).ToActionResult();

    [HttpGet("me")]
    [ProducesResponseType(typeof(AdminProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Me(CancellationToken ct) =>
        (await sender.Send(new GetCurrentAdminQuery(CurrentAdminId()), ct)).ToActionResult();

    [HttpPost("change-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct) =>
        (await sender.Send(new ChangePasswordCommand(CurrentAdminId(), request.CurrentPassword, request.NewPassword), ct))
        .ToActionResult();

    // Safe to parse: [Authorize] guarantees a validated token, and our own
    // generator always writes "sub" as the admin's int id.
    private int CurrentAdminId() => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
}