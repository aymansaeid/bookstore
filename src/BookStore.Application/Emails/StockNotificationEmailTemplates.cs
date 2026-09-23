using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Common;

namespace BookStore.Application.Emails;

public static class StockNotificationEmailTemplates
{
    public static EmailMessage ConfirmSubscription(
        string email, string bookTitle, string token, StoreOptions store)
    {
        var url = $"{store.StorefrontBaseUrl}/notify-me/confirm?token={Uri.EscapeDataString(token)}";

        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">Confirm your alert</h1>
            <p style="margin:0;">Confirm that you'd like to be emailed when <strong>{EmailLayout.Encode(bookTitle)}</strong> is back in stock.</p>
            {EmailLayout.Button(url, "Confirm alert")}
            <p style="margin:0;color:#78716c;font-size:13px;">We'll email you once, and only when the book is available. If you didn't request this, ignore this email and nothing will happen.</p>
            """;

        var text = $"""
            Confirm your alert

            Confirm you'd like to be emailed when "{bookTitle}" is back in stock:
            {url}

            We'll email you once, and only when the book is available.
            If you didn't request this, ignore this email.
            """;

        return new EmailMessage(email, $"Confirm your alert for {bookTitle}",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content), text);
    }

    public static EmailMessage BackInStock(
        string email, string bookTitle, string bookSlug, string unsubscribeToken, StoreOptions store)
    {
        var bookUrl = $"{store.StorefrontBaseUrl}/books/{bookSlug}";
        var unsubscribeUrl = $"{store.StorefrontBaseUrl}/notify-me/unsubscribe?token={Uri.EscapeDataString(unsubscribeToken)}";

        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">It's back in stock</h1>
            <p style="margin:0;"><strong>{EmailLayout.Encode(bookTitle)}</strong> is available again.</p>
            {EmailLayout.Button(bookUrl, "Order now")}
            <p style="margin:0;color:#78716c;font-size:13px;">Stock is limited and we can't hold a copy, so order soon if you'd like one. You're receiving this because you asked to be notified &mdash; <a href="{EmailLayout.Encode(unsubscribeUrl)}">unsubscribe</a>.</p>
            """;

        var text = $"""
            It's back in stock

            "{bookTitle}" is available again.

            Order now: {bookUrl}

            Stock is limited and we can't hold a copy, so order soon.
            Unsubscribe: {unsubscribeUrl}
            """;

        return new EmailMessage(email, $"{bookTitle} is back in stock",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content), text);
    }
}