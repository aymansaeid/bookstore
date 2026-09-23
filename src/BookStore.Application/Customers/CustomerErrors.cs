using BookStore.Application.Common;

namespace BookStore.Application.Customers;

public static class CustomerErrors
{
    public static Error InvalidCredentials =>
        Error.Unauthorized("Customer.InvalidCredentials", "Invalid email or password.");

    public static Error EmailNotVerified =>
        Error.Unauthorized("Customer.EmailNotVerified", "Please verify your email address before signing in.");

    public static Error AccountUnavailable =>
        Error.Unauthorized("Customer.AccountUnavailable", "This account is no longer active.");

    public static Error InvalidToken =>
        Error.Validation("Customer.InvalidToken", "This link is invalid or has expired. Please request a new one.");

    public static Error InvalidRefreshToken =>
        Error.Unauthorized("Customer.InvalidRefreshToken", "Your session has expired. Please sign in again.");

    public static Error CurrentPasswordIncorrect =>
        Error.Validation("Customer.CurrentPasswordIncorrect", "The current password is incorrect.");

    public static Error AddressNotFound(int id) =>
        Error.NotFound("Customer.AddressNotFound", $"Address {id} was not found.");

    public static Error AddressLimitReached =>
        Error.Conflict("Customer.AddressLimitReached",
            $"You can save at most {Domain.Customers.Customer.MaxAddresses} addresses.");

    public static Error NotFound =>
        Error.NotFound("Customer.NotFound", "Customer not found.");
}