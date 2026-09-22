using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auth;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using FluentValidation;

namespace BookStore.Application.Auth.Commands;

public sealed record LoginCommand(string Email, string Password) : ICommand<LoginResponse>;

public sealed record LoginResponse(string AccessToken, DateTimeOffset ExpiresAtUtc, string Email, string Role);

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
        // No MinimumLength here on purpose: login only checks the password
        // matches. Length rules belong to SETTING a password, not using one.
        RuleFor(x => x.Password).NotEmpty().MaximumLength(PasswordRules.MaxLength);
    }
}

public sealed class LoginCommandHandler(
    IAdminUserRepository adminUserRepository,
    IPasswordHasher passwordHasher,
    IJwtTokenGenerator tokenGenerator,
    IUnitOfWork unitOfWork)
    : ICommandHandler<LoginCommand, LoginResponse>
{
    public async Task<Result<LoginResponse>> Handle(LoginCommand command, CancellationToken ct)
    {
        var user = await adminUserRepository.GetByEmailAsync(command.Email.Trim(), ct);

        // Always verify, even when user is null: the hasher compares against
        // a dummy hash so "no such email" costs the same time as "wrong password".
        var verification = passwordHasher.Verify(user?.PasswordHash, command.Password);

        if (user is null || !user.IsActive || verification == PasswordVerification.Failed)
            return Result.Failure<LoginResponse>(AuthErrors.InvalidCredentials);

        // Transparent upgrade: if the stored hash uses older settings, re-hash
        // with current ones now, while we have the plaintext in hand.
        if (verification == PasswordVerification.SuccessRehashNeeded)
            user.ChangePasswordHash(passwordHasher.Hash(command.Password));

        user.RecordLogin();
        await unitOfWork.SaveChangesAsync(ct);

        var token = tokenGenerator.Generate(user);
        return Result.Success(new LoginResponse(token.Token, token.ExpiresAtUtc, user.Email, user.Role.ToString()));
    }
}