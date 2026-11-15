using System.Net;
using System.Text;
using BookStore.Application.Common;
using BookStore.Domain.Common;

namespace BookStore.Application.Emails;

/// Deliberately plain HTML with inline styles and a table-based layout —
/// that's what email clients (especially Outlook) actually render reliably.
/// Everything user-supplied goes through Encode().
public static class EmailLayout
{
    public const string TotalsTableStart =
        """<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-top:8px;">""";

    public static string Encode(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);

    /// Customer emails: store name, direction and footer follow the language.
    public static string Wrap(StoreOptions store, Language language, string contentHtml) =>
        Document(language, store.NameIn(language), EmailCopy.For(language).Footer(store.SupportEmail), contentHtml);

    /// Admin emails: English, left to right (unchanged).
    public static string Wrap(string storeName, string supportEmail, string contentHtml) =>
        Document(Language.En, storeName, $"Questions? Reply to this email or contact us at {supportEmail}.", contentHtml);

    public static string Heading(string text) =>
        $"""<h1 style="margin:0 0 16px;font-size:22px;">{Encode(text)}</h1>""";

    public static string Paragraph(string text, string margin = "0 0 16px") =>
        $"""<p style="margin:{margin};">{Encode(text)}</p>""";

    public static string Muted(string text, string margin = "0") =>
        $"""<p style="margin:{margin};color:#57534e;">{Encode(text)}</p>""";

    /// Small grey print. Takes HTML: callers encode their own parts.
    public static string NoteHtml(string html) =>
        $"""<p style="margin:0;color:#78716c;font-size:13px;">{html}</p>""";

    public static string Note(string text) => NoteHtml(Encode(text));

    public static string Link(string url, string label) =>
        $"""<a href="{Encode(url)}">{Encode(label)}</a>""";

    public static string Button(string url, string label) => $"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr><td style="background:#1c1917;border-radius:6px;">
            <a href="{Encode(url)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">{Encode(label)}</a>
          </td></tr>
        </table>
        """;

    public static string LineItemsTable(IEnumerable<(string Title, int Quantity, string LineTotal)> lines) =>
        LineItemsTable(lines, Language.En);

    public static string LineItemsTable(IEnumerable<(string Title, int Quantity, string LineTotal)> lines, Language language)
    {
        var end = End(language);
        var builder = new StringBuilder();
        builder.Append("""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;">""");

        foreach (var (title, quantity, lineTotal) in lines)
        {
            builder.Append($"""
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;">{Encode(title)} &times; {quantity}</td>
                  <td align="{end}" style="padding:8px 0;border-bottom:1px solid #f5f5f4;white-space:nowrap;">{Encode(lineTotal)}</td>
                </tr>
                """);
        }

        builder.Append("</table>");
        return builder.ToString();
    }

    public static string TotalsRow(string label, string amount, bool bold = false) =>
        TotalsRow(label, amount, Language.En, bold);

    public static string TotalsRow(string label, string amount, Language language, bool bold = false)
    {
        var weight = bold ? "600" : "400";
        return $"""
            <tr>
              <td style="padding:4px 0;font-weight:{weight};">{Encode(label)}</td>
              <td align="{End(language)}" style="padding:4px 0;font-weight:{weight};white-space:nowrap;">{Encode(amount)}</td>
            </tr>
            """;
    }

    /// "Label   value" row for small detail tables (carrier, tracking number).
    public static string DetailRow(string label, string valueHtml, Language language)
    {
        var gap = language.IsRightToLeft() ? "padding:4px 0 4px 16px;" : "padding:4px 16px 4px 0;";
        return $"""<tr><td style="{gap}color:#78716c;">{Encode(label)}</td><td>{valueHtml}</td></tr>""";
    }

    /// Plain-text part: blocks separated by blank lines, empty ones skipped.
    public static string PlainText(params string?[] blocks) =>
        string.Join("\n\n", blocks.Where(b => !string.IsNullOrWhiteSpace(b)));

    private static string End(Language language) => language.IsRightToLeft() ? "left" : "right";

    private static string Document(Language language, string storeName, string footer, string contentHtml)
    {
        var rtl = language.IsRightToLeft();
        var dir = rtl ? "rtl" : "ltr";
        var align = rtl ? "right" : "left";
        var font = rtl ? "Tahoma,'Segoe UI',Arial,sans-serif" : "Helvetica,Arial,sans-serif";

        return $"""
        <!DOCTYPE html>
        <html lang="{language.Code()}" dir="{dir}">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body dir="{dir}" style="margin:0;padding:0;background:#f5f5f4;font-family:{font};color:#1c1917;direction:{dir};text-align:{align};">
          <table role="presentation" dir="{dir}" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 12px;">
            <tr><td align="center">
              <table role="presentation" dir="{dir}" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
                <tr><td style="padding:24px 28px;border-bottom:1px solid #e7e5e4;text-align:{align};">
                  <span style="font-size:18px;font-weight:600;">{Encode(storeName)}</span>
                </td></tr>
                <tr><td style="padding:28px;font-size:15px;line-height:1.7;text-align:{align};">{contentHtml}</td></tr>
                <tr><td style="padding:20px 28px;border-top:1px solid #e7e5e4;font-size:13px;color:#78716c;text-align:{align};">
                  {Encode(footer)}
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;
    }
}