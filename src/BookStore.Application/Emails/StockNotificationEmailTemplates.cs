using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Common;
using BookStore.Domain.Common;

namespace BookStore.Application.Emails;

/// language: the language the alert was requested in.
public static class StockNotificationEmailTemplates
{
    public static EmailMessage ConfirmSubscription(
        string email, string bookTitle, string token, StoreOptions store, Language language = Language.Ar)
    {
        var t = EmailCopy.For(language);
        var url = StorefrontLinks.For(store, language, $"/notify-me/confirm?token={Uri.EscapeDataString(token)}");

        var content = string.Concat(
            EmailLayout.Heading(t.AlertHeading),
            EmailLayout.Paragraph(t.AlertBody(bookTitle), "0"),
            EmailLayout.Button(url, t.AlertButton),
            EmailLayout.Note(t.AlertNote));

        var text = EmailLayout.PlainText(t.AlertHeading, t.AlertBody(bookTitle), url, t.AlertNote);

        return new EmailMessage(email, t.AlertSubject(bookTitle), EmailLayout.Wrap(store, language, content), text);
    }

    public static EmailMessage BackInStock(
        string email, string bookTitle, string bookSlug, string unsubscribeToken, StoreOptions store,
        Language language = Language.Ar)
    {
        var t = EmailCopy.For(language);
        var bookUrl = StorefrontLinks.Book(store, language, bookSlug);
        var unsubscribeUrl = StorefrontLinks.For(
            store, language, $"/notify-me/unsubscribe?token={Uri.EscapeDataString(unsubscribeToken)}");

        var content = string.Concat(
            EmailLayout.Heading(t.BackHeading),
            EmailLayout.Paragraph(t.BackBody(bookTitle), "0"),
            EmailLayout.Button(bookUrl, t.OrderNow),
            EmailLayout.NoteHtml(
                $"{EmailLayout.Encode(t.BackNote)} {EmailLayout.Encode(t.WhyYouGotThis)} {EmailLayout.Link(unsubscribeUrl, t.Unsubscribe)}."));

        var text = EmailLayout.PlainText(
            t.BackHeading, t.BackBody(bookTitle), $"{t.OrderNow}: {bookUrl}", t.BackNote, $"{t.Unsubscribe}: {unsubscribeUrl}");

        return new EmailMessage(email, t.BackSubject(bookTitle), EmailLayout.Wrap(store, language, content), text);
    }
}