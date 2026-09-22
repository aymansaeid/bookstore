using FluentValidation;

namespace BookStore.Application.Auth;

public static class PasswordRules
{
    public const int MinLength = 12;

    // Upper bound matters too: without it, someone can POST a 10 MB
    // "password" and make the server burn CPU hashing it.
    public const int MaxLength = 128;

    public static IRuleBuilderOptions<T, string> ValidNewPassword<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty()
            .MinimumLength(MinLength)
            .MaximumLength(MaxLength);
}