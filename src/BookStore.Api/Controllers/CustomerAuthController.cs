using System.Security.Claims;
using BookStore.Api.Common;
using BookStore.Application.Customers;
using BookStore.Application.Customers.Commands;
using BookStore.Application.Customers.Queries;
using BookStore.Infrastructure.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.JsonWebTokens;

namespace BookStore.Api.Controllers;

public sealed record RegisterRequest(
    string Email, string Password, string FirstName, string LastName, string? Phone, bool AcceptsMarketingEmails);

public sealed record CustomerLoginRequest(string Email, string Password);
public sealed record VerifyEmailRequest(string Token);
public sealed record ForgotPasswordRequest(string Email);
public sealed record ResetPasswordRequest(string Token, string NewPassword);

[ApiController]
[Route("api/customers/auth")]
public sealed class CustomerAuthController(ISender sender, IWebHostEnvironment env) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting("customer-auth")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register(RegisterRequest r, CancellationToken ct) =>
        (await sender.Send(new RegisterCustomerCommand(
            r.Email, r.Password, r.FirstName, r.LastName, r.Phone, r.AcceptsMarketingEmails), ct))
        .ToActionResult();

    [HttpPost("verify-email")]
    [EnableRateLimiting("customer-auth")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyEmail(VerifyEmailRequest r, CancellationToken ct) =>
        (await sender.Send(new VerifyEmailCommand(r.Token), ct)).ToActionResult();

    [HttpPost("login")]
    [EnableRateLimiting("customer-auth")]
    [ProducesResponseType(typeof(CustomerAuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(CustomerLoginRequest r, CancellationToken ct)
    {
        var result = await sender.Send(new CustomerLoginCommand(r.Email, r.Password), ct);
        if (result.IsFailure)
            return result.Error.ToProblem();

        RefreshTokenCookie.Set(Response, result.Value.RefreshToken, result.Value.RefreshExpiresAtUtc, env);
        return Ok(result.Value.Response);
    }

    [HttpPost("refresh")]
    [ProducesResponseType(typeof(CustomerAuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        // Read from the cookie, never the body: the frontend doesn't (and
        // shouldn't) have access to this value.
        var refreshToken = Request.Cookies[RefreshTokenCookie.Name];
        if (string.IsNullOrWhiteSpace(refreshToken))
            return CustomerErrors.InvalidRefreshToken.ToProblem();

        var result = await sender.Send(new RefreshCustomerTokenCommand(refreshToken), ct);
        if (result.IsFailure)
        {
            RefreshTokenCookie.Clear(Response);
            return result.Error.ToProblem();
        }

        RefreshTokenCookie.Set(Response, result.Value.RefreshToken, result.Value.RefreshExpiresAtUtc, env);
        return Ok(result.Value.Response);
    }

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        await sender.Send(new LogoutCustomerCommand(Request.Cookies[RefreshTokenCookie.Name]), ct);
        RefreshTokenCookie.Clear(Response);
        return NoContent();
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("customer-auth")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest r, CancellationToken ct) =>
        (await sender.Send(new RequestPasswordResetCommand(r.Email), ct)).ToActionResult();

    [HttpPost("reset-password")]
    [EnableRateLimiting("customer-auth")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest r, CancellationToken ct) =>
        (await sender.Send(new ResetPasswordCommand(r.Token, r.NewPassword), ct)).ToActionResult();
}