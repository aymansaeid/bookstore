using System.Net;
using System.Text;

namespace BookStore.Application.Emails;

/// Deliberately plain HTML with inline styles and a table-based layout —
/// that's what email clients (especially Outlook) actually render reliably.
/// Everything user-supplied goes through Encode().
public static class EmailLayout
{
    public static string Encode(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);

    public static string Wrap(string storeName, string supportEmail, string contentHtml)
    {
        var name = Encode(storeName);
        var support = Encode(supportEmail);

        return $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Helvetica,Arial,sans-serif;color:#1c1917;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 12px;">
            <tr><td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
                <tr><td style="padding:24px 28px;border-bottom:1px solid #e7e5e4;">
                  <span style="font-size:18px;font-weight:600;">{name}</span>
                </td></tr>
                <tr><td style="padding:28px;font-size:15px;line-height:1.6;">{contentHtml}</td></tr>
                <tr><td style="padding:20px 28px;border-top:1px solid #e7e5e4;font-size:13px;color:#78716c;">
                  Questions? Reply to this email or contact us at {support}.
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;
    }

    public static string Button(string url, string label) => $"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr><td style="background:#1c1917;border-radius:6px;">
            <a href="{Encode(url)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">{Encode(label)}</a>
          </td></tr>
        </table>
        """;

    public static string LineItemsTable(IEnumerable<(string Title, int Quantity, string LineTotal)> lines)
    {
        var builder = new StringBuilder();
        builder.Append("""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;">""");

        foreach (var (title, quantity, lineTotal) in lines)
        {
            builder.Append($"""
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;">{Encode(title)} &times; {quantity}</td>
                  <td align="right" style="padding:8px 0;border-bottom:1px solid #f5f5f4;">{Encode(lineTotal)}</td>
                </tr>
                """);
        }

        builder.Append("</table>");
        return builder.ToString();
    }

    public static string TotalsRow(string label, string amount, bool bold = false)
    {
        var weight = bold ? "600" : "400";
        return $"""
            <tr>
              <td style="padding:4px 0;font-weight:{weight};">{Encode(label)}</td>
              <td align="right" style="padding:4px 0;font-weight:{weight};">{Encode(amount)}</td>
            </tr>
            """;
    }
}