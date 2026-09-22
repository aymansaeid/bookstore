using BookStore.Application.Common;

namespace BookStore.Application.Auth;

public static class AuthErrors
{
    // One message for every login failure. Never say which part was wrong.
    public static Error InvalidCredentials =>
        Error.Unauthorized("Auth.InvalidCredentials", "Invalid email or password.");

    public static Error AccountUnavailable =>
        Error.Unauthorized("Auth.AccountUnavailable", "This account is no longer active.");

    public static Error CurrentPasswordIncorrect =>
        Error.Validation("Auth.CurrentPasswordIncorrect", "The current password is incorrect.");
}