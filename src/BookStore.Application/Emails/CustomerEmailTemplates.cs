using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Common;
using BookStore.Domain.Customers;

namespace BookStore.Application.Emails;

/// Account emails, in the customer's preferred language.
public static class CustomerEmailTemplates
{
    public static EmailMessage VerifyEmail(Customer customer, string token, StoreOptions store)
    {
        var language = customer.PreferredLanguage;
        var t = EmailCopy.For(language);
        var storeName = store.NameIn(language);
        var url = StorefrontLinks.For(store, language, $"/verify-email?token={Uri.EscapeDataString(token)}");

        var content = string.Concat(
            EmailLayout.Heading(t.VerifyHeading),
            EmailLayout.Paragraph(t.VerifyGreeting(customer.FirstName, storeName), "0 0 8px"),
            EmailLayout.Paragraph(t.VerifyBody, "0"),
            EmailLayout.Button(url, t.VerifyButton),
            EmailLayout.Note(t.VerifyNote));

        var text = EmailLayout.PlainText(
            t.VerifyHeading, t.VerifyGreeting(customer.FirstName, storeName), $"{t.VerifyButton}: {url}", t.VerifyNote);

        return new EmailMessage(customer.Email, t.VerifySubject(storeName),
            EmailLayout.Wrap(store, language, content), text);
    }

    public static EmailMessage PasswordReset(Customer customer, string token, StoreOptions store)
    {
        var language = customer.PreferredLanguage;
        var t = EmailCopy.For(language);
        var url = StorefrontLinks.For(store, language, $"/reset-password?token={Uri.EscapeDataString(token)}");

        var content = string.Concat(
            EmailLayout.Heading(t.ResetHeading),
            EmailLayout.Paragraph(t.ResetBody, "0"),
            EmailLayout.Button(url, t.ResetButton),
            EmailLayout.Note(t.ResetNote));

        var text = EmailLayout.PlainText(t.ResetHeading, t.ResetBody, $"{t.ResetButton}: {url}", t.ResetNote);

        return new EmailMessage(customer.Email, t.ResetSubject(store.NameIn(language)),
            EmailLayout.Wrap(store, language, content), text);
    }

    /// Sent when someone tries to register with an address that's already
    /// in use — lets the real owner know, without telling the registrant
    /// that the account exists.
    public static EmailMessage RegistrationAttemptOnExistingAccount(Customer customer, StoreOptions store)
    {
        var language = customer.PreferredLanguage;
        var t = EmailCopy.For(language);
        var loginUrl = StorefrontLinks.For(store, language, "/login");
        var resetUrl = StorefrontLinks.For(store, language, "/forgot-password");

        var content = string.Concat(
            EmailLayout.Heading(t.ExistingHeading),
            EmailLayout.Paragraph(t.ExistingBody, "0 0 8px"),
            EmailLayout.Paragraph(t.ExistingHint, "0"),
            EmailLayout.Button(loginUrl, t.SignIn),
            EmailLayout.NoteHtml(
                $"{EmailLayout.Encode(t.ForgotPassword)} {EmailLayout.Link(resetUrl, t.ResetHere)}. {EmailLayout.Encode(t.IgnoreIfNotYou)}"));

        var text = EmailLayout.PlainText(
            t.ExistingHeading, t.ExistingBody,
            $"{t.SignIn}: {loginUrl}\n{t.ForgotPassword} {resetUrl}",
            t.IgnoreIfNotYou);

        return new EmailMessage(customer.Email, t.ExistingSubject(store.NameIn(language)),
            EmailLayout.Wrap(store, language, content), text);
    }
}