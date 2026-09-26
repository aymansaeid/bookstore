using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Auth;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using FluentValidation;

namespace BookStore.Application.Auth.Commands;

public sealed record ChangePasswordCommand(int AdminUserId, string CurrentPassword, string NewPassword)
    : ICommand, IAuditableCommand
{
    public string AuditEntityType => "AdminUser";
    public string? AuditEntityId => AdminUserId.ToString();
    object IAuditableCommand.AuditDetails => new { AdminUserId };
}
public sealed class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordCommandValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().MaximumLength(PasswordRules.MaxLength);
        RuleFor(x => x.NewPassword)
            .ValidNewPassword()
            .NotEqual(x => x.CurrentPassword)
            .WithMessage("The new password must be different from the current one.");
    }
}

public sealed class ChangePasswordCommandHandler(
    IAdminUserRepository adminUserRepository,
    IPasswordHasher passwordHasher,
    IUnitOfWork unitOfWork)
    : ICommandHandler<ChangePasswordCommand>
{
    public async Task<Result> Handle(ChangePasswordCommand command, CancellationToken ct)
    {
        var user = await adminUserRepository.GetByIdAsync(command.AdminUserId, ct);
        if (user is null || !user.IsActive)
            return Result.Failure(AuthErrors.AccountUnavailable);

        // Re-confirm the current password even though they're logged in.
        // A stolen token alone shouldn't be enough to take over the account.
        if (passwordHasher.Verify(user.PasswordHash, command.CurrentPassword) == PasswordVerification.Failed)
            return Result.Failure(AuthErrors.CurrentPasswordIncorrect);

        user.ChangePasswordHash(passwordHasher.Hash(command.NewPassword));
        await unitOfWork.SaveChangesAsync(ct);

        // Known limitation (decision #3): tokens issued before this change
        // stay valid until they expire, at most 60 minutes.
        return Result.Success();
    }
}