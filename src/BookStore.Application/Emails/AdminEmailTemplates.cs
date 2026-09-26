using System.Text;
using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Common;
using BookStore.Application.Inventory;

namespace BookStore.Application.Emails;

public static class AdminEmailTemplates
{
    public static EmailMessage LowStockDigest(
        string toEmail, IReadOnlyList<LowStockAlertItem> items, StoreOptions store)
    {
        var inventoryUrl = $"{store.AdminBaseUrl}/inventory";

        var rows = new StringBuilder();
        foreach (var item in items)
        {
            rows.Append($"""
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;">{EmailLayout.Encode(item.Title)}</td>
                  <td align="right" style="padding:8px 0;border-bottom:1px solid #f5f5f4;"><strong>{item.AvailableToSell}</strong> / {item.Threshold}</td>
                  <td align="right" style="padding:8px 0;border-bottom:1px solid #f5f5f4;">{item.WaitingListCount}</td>
                </tr>
                """);
        }

        var content = $"""
            <h1 style="margin:0 0 16px;font-size:22px;">Low stock</h1>
            <p style="margin:0;">{items.Count} book(s) have dropped to or below their low-stock threshold.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;">
              <tr style="color:#78716c;">
                <td style="padding:4px 0;">Book</td>
                <td align="right" style="padding:4px 0;">Available / threshold</td>
                <td align="right" style="padding:4px 0;">Waiting list</td>
              </tr>
              {rows}
            </table>
            {EmailLayout.Button(inventoryUrl, "Open inventory")}
            """;

        var text = new StringBuilder("Low stock\n\n");
        foreach (var item in items)
            text.AppendLine($"- {item.Title}: {item.AvailableToSell} available (threshold {item.Threshold}), {item.WaitingListCount} waiting");
        text.AppendLine($"\nOpen inventory: {inventoryUrl}");

        return new EmailMessage(toEmail, $"Low stock: {items.Count} book(s) need attention",
            EmailLayout.Wrap(store.Name, store.SupportEmail, content), text.ToString());
    }
}