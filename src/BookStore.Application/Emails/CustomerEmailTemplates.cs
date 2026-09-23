using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Common;
using BookStore.Domain.Customers;

namespace BookStore.Application.Emails;

public static class CustomerEmailTemplates
{
    public static EmailMessage VerifyEmail(Customer customer, string token, StoreOptions store)
    {
        var url = $"{store.StorefrontBaseUrl}/verify-email?token={Uri.EscapeDataString(token)}";

        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">Confirm your email</h1>
            <p style="margin:0 0 8px;">Hi {EmailLayout.Encode(customer.FirstName)}, welcome to {EmailLayout.Encode(store.Name)}.</p>
            <p style="margin:0;">Click below to confirm your email address and activate your account.</p>
            {EmailLayout.Button(url, "Confirm email")}
            <p style="margin:0;color:#78716c;font-size:13px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
            """;

        var text = $"""
            Confirm your email

            Hi {customer.FirstName}, welcome to {store.Name}.

            Confirm your email address: {url}

            This link expires in 24 hours.
            """;

        return new EmailMessage(customer.Email, $"Confirm your email for {store.Name}",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content), text);
    }

    public static EmailMessage PasswordReset(Customer customer, string token, StoreOptions store)
    {
        var url = $"{store.StorefrontBaseUrl}/reset-password?token={Uri.EscapeDataString(token)}";

        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">Reset your password</h1>
            <p style="margin:0;">We received a request to reset the password for your account.</p>
            {EmailLayout.Button(url, "Reset password")}
            <p style="margin:0;color:#78716c;font-size:13px;">This link expires in 30 minutes and can be used once. If you didn't request this, no action is needed &mdash; your password hasn't changed.</p>
            """;

        var text = $"""
            Reset your password

            Reset your password: {url}

            This link expires in 30 minutes and can be used once.
            If you didn't request this, your password hasn't changed.
            """;

        return new EmailMessage(customer.Email, $"Reset your {store.Name} password",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content), text);
    }

    /// Sent when someone tries to register with an address that's already
    /// in use — lets the real owner know, without telling the registrant
    /// that the account exists.
    public static EmailMessage RegistrationAttemptOnExistingAccount(Customer customer, StoreOptions store)
    {
        var loginUrl = $"{store.StorefrontBaseUrl}/login";
        var resetUrl = $"{store.StorefrontBaseUrl}/forgot-password";

        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">You already have an account</h1>
            <p style="margin:0 0 8px;">Someone just tried to create an account with this email address, but you already have one with us.</p>
            <p style="margin:0;">If that was you, sign in instead &mdash; or reset your password if you've forgotten it.</p>
            {EmailLayout.Button(loginUrl, "Sign in")}
            <p style="margin:0;color:#78716c;font-size:13px;">Forgot your password? <a href="{EmailLayout.Encode(resetUrl)}">Reset it here</a>. If this wasn't you, you can safely ignore this email.</p>
            """;

        var text = $"""
            You already have an account

            Someone tried to create an account with this email address, but you already have one.

            Sign in: {loginUrl}
            Reset your password: {resetUrl}

            If this wasn't you, you can ignore this email.
            """;

        return new EmailMessage(customer.Email, $"You already have a {store.Name} account",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content), text);
    }
}