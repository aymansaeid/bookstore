using System.Globalization;
using System.Text;
using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Common;
using BookStore.Domain.Orders;

namespace BookStore.Application.Emails;

/// Order emails, in the language the order was placed in.
public static class OrderEmailTemplates
{
    /// lineTitles: book titles in the order's language, by book id. Lines
    /// without one show the title recorded at purchase.
    public static EmailMessage OrderConfirmation(
        Order order, StoreOptions store, bool includesLegalDocuments = false,
        IReadOnlyDictionary<int, string>? lineTitles = null)
    {
        var language = order.Language;
        var t = EmailCopy.For(language);
        var money = MoneyFormatter(order.Total.Currency);
        var trackUrl = StorefrontLinks.TrackOrder(store, language, order.OrderNumber);

        string TitleOf(OrderLine line) => lineTitles?.GetValueOrDefault(line.BookId) ?? line.BookTitleSnapshot;

        var lines = order.Lines.Select(l => (TitleOf(l), l.Quantity, money(l.LineTotal.Amount))).ToList();

        var totals = new StringBuilder(EmailLayout.TotalsTableStart);
        totals.Append(EmailLayout.TotalsRow(t.Subtotal, money(order.Subtotal.Amount), language));

        if (order.PathDiscountAmount.Amount > 0)
            totals.Append(EmailLayout.TotalsRow(t.PathDiscount, "−" + money(order.PathDiscountAmount.Amount), language));

        if (order.CouponDiscountAmount.Amount > 0)
            totals.Append(EmailLayout.TotalsRow(
                t.CouponDiscount(order.AppliedCouponCode ?? string.Empty), "−" + money(order.CouponDiscountAmount.Amount), language));

        totals.Append(EmailLayout.TotalsRow(
            ShippingLabel(order, t),
            order.ShippingCost.Amount == 0 ? t.Free : money(order.ShippingCost.Amount),
            language));

        if (order.GiftWrap)
            totals.Append(EmailLayout.TotalsRow(t.GiftWrap, money(order.GiftWrapFee.Amount), language));

        totals.Append(EmailLayout.TotalsRow(t.Total, money(order.Total.Amount), language, bold: true));
        totals.Append("</table>");

        var address = order.ShippingAddress;
        var addressParts = new[]
            {
                address.RecipientName, address.Line1, address.Line2,
                $"{address.City} {address.PostalCode}", address.StateOrProvince, address.CountryCode
            }
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .ToList();

        var content = string.Concat(
            EmailLayout.Heading(t.ConfirmedHeading),
            EmailLayout.Paragraph(t.ConfirmedIntro(order.OrderNumber), "0 0 4px"),
            EmailLayout.LineItemsTable(lines, language),
            totals.ToString(),
            EmailLayout.Button(trackUrl, t.TrackOrder),
            includesLegalDocuments ? EmailLayout.Muted(t.LegalAttached, "16px 0 0") : string.Empty,
            $"""<p style="margin:24px 0 8px;font-weight:600;">{EmailLayout.Encode(t.ShippingTo)}</p>""",
            $"""<p style="margin:0;color:#57534e;">{string.Join("<br>", addressParts.Select(EmailLayout.Encode))}</p>""");

        var text = EmailLayout.PlainText(
            t.ConfirmedHeading,
            t.ConfirmedIntro(order.OrderNumber),
            string.Join("\n", order.Lines.Select(l => $"- {TitleOf(l)} x{l.Quantity}  {money(l.LineTotal.Amount)}")),
            $"{t.Total}: {money(order.Total.Amount)}",
            $"{t.TrackOrder}: {trackUrl}");

        return new EmailMessage(order.CustomerEmail, t.ConfirmedSubject(order.OrderNumber),
            EmailLayout.Wrap(store, language, content), text);
    }

    public static EmailMessage OrderShipped(Order order, StoreOptions store)
    {
        var language = order.Language;
        var t = EmailCopy.For(language);
        var trackUrl = StorefrontLinks.TrackOrder(store, language, order.OrderNumber);

        var content = string.Concat(
            EmailLayout.Heading(t.ShippedHeading),
            EmailLayout.Paragraph(t.ShippedIntro(order.OrderNumber)),
            """<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">""",
            EmailLayout.DetailRow(t.Carrier, EmailLayout.Encode(order.ShippingCarrier), language),
            EmailLayout.DetailRow(t.TrackingNumber, $"<strong>{EmailLayout.Encode(order.TrackingNumber)}</strong>", language),
            "</table>",
            EmailLayout.Button(trackUrl, t.TrackOrder),
            EmailLayout.Note(t.ShippedNote));

        var text = EmailLayout.PlainText(
            t.ShippedHeading,
            t.ShippedIntro(order.OrderNumber),
            $"{t.Carrier}: {order.ShippingCarrier}\n{t.TrackingNumber}: {order.TrackingNumber}",
            $"{t.TrackOrder}: {trackUrl}");

        return new EmailMessage(order.CustomerEmail, t.ShippedSubject(order.OrderNumber),
            EmailLayout.Wrap(store, language, content), text);
    }

    public static EmailMessage OrderDelivered(Order order, StoreOptions store)
    {
        var language = order.Language;
        var t = EmailCopy.For(language);
        var orderUrl = StorefrontLinks.TrackOrder(store, language, order.OrderNumber);

        var content = string.Concat(
            EmailLayout.Heading(t.DeliveredHeading),
            EmailLayout.Paragraph(t.DeliveredIntro(order.OrderNumber), "0"),
            EmailLayout.Button(orderUrl, t.ViewOrder),
            EmailLayout.Note(t.DeliveredNote));

        var text = EmailLayout.PlainText(
            t.DeliveredHeading, t.DeliveredIntro(order.OrderNumber), $"{t.ViewOrder}: {orderUrl}", t.DeliveredNote);

        return new EmailMessage(order.CustomerEmail, t.DeliveredSubject(order.OrderNumber),
            EmailLayout.Wrap(store, language, content), text);
    }

    public static EmailMessage OrderCancelled(Order order, bool wasPaid, StoreOptions store, bool byCustomer = false)
    {
        var language = order.Language;
        var t = EmailCopy.For(language);
        var reason = string.IsNullOrWhiteSpace(order.CancellationReason) ? null : t.Reason(order.CancellationReason);

        var content = string.Concat(
            EmailLayout.Heading(t.CancelledHeading),
            EmailLayout.Paragraph(t.CancelledIntro(order.OrderNumber, byCustomer)),
            wasPaid ? EmailLayout.Paragraph(t.RefundIssued) : string.Empty,
            reason is null ? string.Empty : EmailLayout.Muted(reason));

        var text = EmailLayout.PlainText(
            t.CancelledHeading,
            t.CancelledIntro(order.OrderNumber, byCustomer),
            wasPaid ? t.RefundIssued : null,
            reason);

        return new EmailMessage(order.CustomerEmail, t.CancelledSubject(order.OrderNumber),
            EmailLayout.Wrap(store, language, content), text);
    }

    private static string ShippingLabel(Order order, EmailCopy t)
    {
        if (order.ShippingMethodCode == "pickup")
            return order.ShippingMethodName ?? t.Pickup;

        // Older orders stored the English fallback "Standard".
        var name = string.IsNullOrWhiteSpace(order.ShippingMethodName) || order.ShippingMethodName == "Standard"
            ? t.StandardShipping
            : order.ShippingMethodName;

        return t.ShippingWith(name);
    }

    /// Currency-aware formatting. Falls back to "25.00 USD" for codes the
    /// runtime has no culture for, rather than throwing mid-email.
    internal static Func<decimal, string> MoneyFormatter(string currencyCode)
    {
        var culture = CultureInfo.GetCultures(CultureTypes.SpecificCultures)
            .FirstOrDefault(c =>
            {
                try { return new RegionInfo(c.Name).ISOCurrencySymbol == currencyCode; }
                catch (ArgumentException) { return false; }
            });

        return culture is null
            ? amount => $"{amount:0.00} {currencyCode}"
            : amount => amount.ToString("C", culture);
    }
}