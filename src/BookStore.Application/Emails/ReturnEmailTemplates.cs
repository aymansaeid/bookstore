using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Common;
using BookStore.Domain.Returns;
using BookStore.Domain.Returns.Events;

namespace BookStore.Application.Emails;

public static class ReturnEmailTemplates
{
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

    public static EmailMessage Approved(ReturnRequest r, StoreOptions store)
    {
        var money = OrderEmailTemplates.MoneyFormatter(r.RefundAmount.Currency);

        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">Your return is approved</h1>
            <p style="margin:0 0 16px;">Your return for order <strong>{EmailLayout.Encode(r.OrderNumber)}</strong> has been approved.</p>
            <p style="margin:0 0 8px;font-weight:600;">How to send it back</p>
            <p style="margin:0 0 16px;">{EmailLayout.Encode(r.ReturnInstructions)}</p>
            <p style="margin:0;">Once we receive it, we'll refund <strong>{EmailLayout.Encode(money(r.RefundAmount.Amount))}</strong> to your original payment method.</p>
            """;

        var text = $"""
            Your return is approved

            Order {r.OrderNumber}

            How to send it back:
            {r.ReturnInstructions}

            Once we receive it, we'll refund {money(r.RefundAmount.Amount)} to your original payment method.
            """;

        return new EmailMessage(r.CustomerEmail, $"Return approved for order {r.OrderNumber}",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content), text);
    }

    public static EmailMessage Rejected(ReturnRequest r, StoreOptions store)
    {
        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">About your return request</h1>
            <p style="margin:0 0 16px;">We weren't able to accept the return for order <strong>{EmailLayout.Encode(r.OrderNumber)}</strong>.</p>
            <p style="margin:0 0 16px;">Reason: {EmailLayout.Encode(r.RejectionReason)}</p>
            <p style="margin:0;">If you think this is a mistake, just reply to this email.</p>
            """;

        var text = $"""
            About your return request

            We weren't able to accept the return for order {r.OrderNumber}.
            Reason: {r.RejectionReason}

            If you think this is a mistake, reply to this email.
            """;

        return new EmailMessage(r.CustomerEmail, $"Your return request for order {r.OrderNumber}",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content), text);
    }

    public static EmailMessage Completed(ReturnRequest r, StoreOptions store)
    {
        var money = OrderEmailTemplates.MoneyFormatter(r.RefundAmount.Currency);

        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">Your refund is on its way</h1>
            <p style="margin:0 0 16px;">We've received your return for order <strong>{EmailLayout.Encode(r.OrderNumber)}</strong>
            and refunded <strong>{EmailLayout.Encode(money(r.RefundAmount.Amount))}</strong>.</p>
            <p style="margin:0;color:#57534e;">It should appear on your original payment method within 5&ndash;10 business days.</p>
            """;

        var text = $"""
            Your refund is on its way

            We've received your return for order {r.OrderNumber} and refunded {money(r.RefundAmount.Amount)}.
            It should appear within 5-10 business days.
            """;

        return new EmailMessage(r.CustomerEmail, $"Refund issued for order {r.OrderNumber}",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content), text);
    }
}