using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Common;
using BookStore.Domain.Common;
using BookStore.Domain.Returns;
using BookStore.Domain.Returns.Events;

namespace BookStore.Application.Emails;

public static class ReturnEmailTemplates
{
    /// To the admin: unchanged (English).
    public static EmailMessage RequestedToAdmin(string toEmail, ReturnRequestedDomainEvent e, StoreOptions store)
    {
        var url = $"{store.AdminBaseUrl}/returns";
        var scope = e.IsFullReturn ? "full" : "partial";

        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">New return request</h1>
            <p style="margin:0;">Order <strong>{EmailLayout.Encode(e.OrderNumber)}</strong>: {scope} return of {e.ItemCount} item(s).
            Reason: {EmailLayout.Encode(e.Reason.ToString())}.</p>
            {EmailLayout.Button(url, "Review returns")}
            """;

        var text = $"New {scope} return request for order {e.OrderNumber} ({e.ItemCount} item(s), reason: {e.Reason}).\n\n{url}";

        return new EmailMessage(toEmail, $"Return requested: {e.OrderNumber}",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content), text);
    }

    /// language: the order's language.
    public static EmailMessage Approved(ReturnRequest r, StoreOptions store, Language language = Language.Ar)
    {
        var t = EmailCopy.For(language);
        var refund = OrderEmailTemplates.MoneyFormatter(r.RefundAmount.Currency)(r.RefundAmount.Amount);

        var content = string.Concat(
            EmailLayout.Heading(t.ReturnApprovedHeading),
            EmailLayout.Paragraph(t.ReturnApprovedIntro(r.OrderNumber)),
            $"""<p style="margin:0 0 8px;font-weight:600;">{EmailLayout.Encode(t.HowToSendBack)}</p>""",
            EmailLayout.Paragraph(r.ReturnInstructions ?? string.Empty),
            EmailLayout.Paragraph(t.RefundOnReceipt(refund), "0"));

        var text = EmailLayout.PlainText(
            t.ReturnApprovedHeading, t.ReturnApprovedIntro(r.OrderNumber),
            $"{t.HowToSendBack}:\n{r.ReturnInstructions}", t.RefundOnReceipt(refund));

        return new EmailMessage(r.CustomerEmail, t.ReturnApprovedSubject(r.OrderNumber),
            EmailLayout.Wrap(store, language, content), text);
    }

    public static EmailMessage Rejected(ReturnRequest r, StoreOptions store, Language language = Language.Ar)
    {
        var t = EmailCopy.For(language);
        var reason = t.Reason(r.RejectionReason ?? string.Empty);

        var content = string.Concat(
            EmailLayout.Heading(t.ReturnRejectedHeading),
            EmailLayout.Paragraph(t.ReturnRejectedIntro(r.OrderNumber)),
            EmailLayout.Paragraph(reason),
            EmailLayout.Paragraph(t.ReturnRejectedNote, "0"));

        var text = EmailLayout.PlainText(
            t.ReturnRejectedHeading, t.ReturnRejectedIntro(r.OrderNumber), reason, t.ReturnRejectedNote);

        return new EmailMessage(r.CustomerEmail, t.ReturnRejectedSubject(r.OrderNumber),
            EmailLayout.Wrap(store, language, content), text);
    }

    public static EmailMessage Completed(ReturnRequest r, StoreOptions store, Language language = Language.Ar)
    {
        var t = EmailCopy.For(language);
        var refund = OrderEmailTemplates.MoneyFormatter(r.RefundAmount.Currency)(r.RefundAmount.Amount);

        var content = string.Concat(
            EmailLayout.Heading(t.RefundHeading),
            EmailLayout.Paragraph(t.RefundIntro(r.OrderNumber, refund)),
            EmailLayout.Muted(t.RefundTiming));

        var text = EmailLayout.PlainText(t.RefundHeading, t.RefundIntro(r.OrderNumber, refund), t.RefundTiming);

        return new EmailMessage(r.CustomerEmail, t.RefundSubject(r.OrderNumber),
            EmailLayout.Wrap(store, language, content), text);
    }
}