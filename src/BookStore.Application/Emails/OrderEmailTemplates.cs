using System.Globalization;
using System.Text;
using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Common;
using BookStore.Domain.Orders;

namespace BookStore.Application.Emails;

public static class OrderEmailTemplates
{
    public static EmailMessage OrderConfirmation(Order order, StoreOptions store)
    {
        var money = MoneyFormatter(order.Total.Currency);
        var trackUrl = $"{store.StorefrontBaseUrl}/track?order={Uri.EscapeDataString(order.OrderNumber)}";

        var lines = order.Lines.Select(l => (l.BookTitleSnapshot, l.Quantity, money(l.LineTotal.Amount)));

        var totals = new StringBuilder("""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-top:8px;">""");
        totals.Append(EmailLayout.TotalsRow("Subtotal", money(order.Subtotal.Amount)));
        if (order.DiscountAmount.Amount > 0)
            totals.Append(EmailLayout.TotalsRow($"Discount ({order.AppliedCouponCode})", $"-{money(order.DiscountAmount.Amount)}"));
        totals.Append(EmailLayout.TotalsRow("Shipping", order.ShippingCost.Amount == 0 ? "Free" : money(order.ShippingCost.Amount)));
        totals.Append(EmailLayout.TotalsRow("Total", money(order.Total.Amount), bold: true));
        totals.Append("</table>");

        var address = order.ShippingAddress;
        var addressHtml = string.Join("<br>", new[]
            {
                address.RecipientName, address.Line1, address.Line2,
                $"{address.City} {address.PostalCode}", address.StateOrProvince, address.CountryCode
            }
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .Select(EmailLayout.Encode));

        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">Thanks for your order</h1>
            <p style="margin:0 0 4px;">Order <strong>{EmailLayout.Encode(order.OrderNumber)}</strong> is confirmed and we're getting it ready to ship.</p>
            {EmailLayout.LineItemsTable(lines)}
            {totals}
            {EmailLayout.Button(trackUrl, "Track your order")}
            <p style="margin:24px 0 8px;font-weight:600;">Shipping to</p>
            <p style="margin:0;color:#57534e;">{addressHtml}</p>
            """;

        var text = $"""
            Thanks for your order

            Order {order.OrderNumber} is confirmed.

            {string.Join("\n", order.Lines.Select(l => $"- {l.BookTitleSnapshot} x{l.Quantity}  {money(l.LineTotal.Amount)}"))}

            Total: {money(order.Total.Amount)}

            Track your order: {trackUrl}
            """;

        return new EmailMessage(
            order.CustomerEmail,
            $"Order {order.OrderNumber} confirmed",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content),
            text);
    }

    public static EmailMessage OrderShipped(Order order, StoreOptions store)
    {
        var trackUrl = $"{store.StorefrontBaseUrl}/track?order={Uri.EscapeDataString(order.OrderNumber)}";

        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">Your order is on its way</h1>
            <p style="margin:0 0 16px;">Order <strong>{EmailLayout.Encode(order.OrderNumber)}</strong> has shipped.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">
              <tr><td style="padding:4px 16px 4px 0;color:#78716c;">Carrier</td><td>{EmailLayout.Encode(order.ShippingCarrier)}</td></tr>
              <tr><td style="padding:4px 16px 4px 0;color:#78716c;">Tracking number</td><td><strong>{EmailLayout.Encode(order.TrackingNumber)}</strong></td></tr>
            </table>
            {EmailLayout.Button(trackUrl, "Track your order")}
            <p style="margin:0;color:#78716c;font-size:13px;">Tracking can take up to 24 hours to appear on the carrier's website.</p>
            """;

        var text = $"""
            Your order is on its way

            Order {order.OrderNumber} has shipped.
            Carrier: {order.ShippingCarrier}
            Tracking number: {order.TrackingNumber}

            Track your order: {trackUrl}
            """;

        return new EmailMessage(
            order.CustomerEmail,
            $"Order {order.OrderNumber} has shipped",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content),
            text);
    }

    public static EmailMessage OrderCancelled(Order order, bool wasPaid, StoreOptions store)
    {
        var refundNote = wasPaid
            ? "<p style=\"margin:0 0 16px;\">Your refund has been issued and should appear on your original payment method within 5&ndash;10 business days.</p>"
            : string.Empty;

        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">Order cancelled</h1>
            <p style="margin:0 0 16px;">Order <strong>{EmailLayout.Encode(order.OrderNumber)}</strong> has been cancelled.</p>
            {refundNote}
            <p style="margin:0;color:#57534e;">Reason: {EmailLayout.Encode(order.CancellationReason)}</p>
            """;

        var text = $"""
            Order cancelled

            Order {order.OrderNumber} has been cancelled.
            {(wasPaid ? "Your refund has been issued and should appear within 5-10 business days.\n" : "")}
            Reason: {order.CancellationReason}
            """;

        return new EmailMessage(
            order.CustomerEmail,
            $"Order {order.OrderNumber} cancelled",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content),
            text);
    }

    /// Currency-aware formatting. Falls back to "25.00 USD" for codes the
    /// runtime has no culture for, rather than throwing mid-email.
    private static Func<decimal, string> MoneyFormatter(string currencyCode)
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