using BookStore.Application.Common;
using BookStore.Domain.Legal;
using BookStore.Domain.Orders;
using Markdig;
using System.Globalization;
using System.Net;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;

namespace BookStore.Application.Legal;

public static class LegalPlaceholders
{
    /// Every placeholder a template may use, with what it means: also served
    /// to the admin UI as the editor's help panel.
    public static readonly IReadOnlyDictionary<string, string> All = new Dictionary<string, string>
    {
        ["SellerName"] = "Registered company name",
        ["SellerAddress"] = "Registered address",
        ["SellerPhone"] = "Seller phone",
        ["SellerEmail"] = "Seller email",
        ["SellerKep"] = "Seller KEP address",
        ["SellerTaxOffice"] = "Tax office",
        ["SellerTaxNumber"] = "Tax number",
        ["SellerMersis"] = "MERSİS number",
        ["OrderNumber"] = "Order number",
        ["OrderDate"] = "Order date and time (store time zone)",
        ["CustomerName"] = "Buyer / recipient name",
        ["CustomerEmail"] = "Buyer email",
        ["CustomerPhone"] = "Buyer phone",
        ["DeliveryAddress"] = "Full delivery address",
        ["ShippingMethod"] = "Chosen shipping method",
        ["ItemsTable"] = "Table of books: title, quantity, unit price, line total",
        ["Subtotal"] = "Books total before discount",
        ["Discount"] = "Coupon discount",
        ["Shipping"] = "Shipping cost",
        ["GiftWrap"] = "Gift wrap fee",
        ["Total"] = "Total payable",
        ["WithdrawalDays"] = "Withdrawal period in days"
    };
}

public sealed record LegalLine(string Title, int Quantity, decimal UnitPrice, decimal LineTotal);

/// Everything a template can show. Order fields are null when rendering
/// the generic public version of a document.
public sealed record LegalRenderContext(
    SellerSettings Seller,
    string Language,
    string Currency,
    string TimeZoneId,
    int WithdrawalDays,
    string? OrderNumber = null,
    DateTimeOffset? OrderDateUtc = null,
    string? CustomerName = null,
    string? CustomerEmail = null,
    string? CustomerPhone = null,
    string? DeliveryAddress = null,
    string? ShippingMethod = null,
    IReadOnlyList<LegalLine>? Lines = null,
    decimal? Subtotal = null,
    decimal? Discount = null,
    decimal? Shipping = null,
    decimal? GiftWrap = null,
    decimal? Total = null);

public static partial class LegalTemplateRenderer
{
    // Raw HTML disabled: admin-written text renders as text, never as markup.
    private static readonly MarkdownPipeline Pipeline =
        new MarkdownPipelineBuilder().UsePipeTables().DisableHtml().Build();

    public static IReadOnlyList<string> UnknownPlaceholders(string markdown) =>
        PlaceholderPattern().Matches(markdown)
            .Select(m => m.Groups[1].Value)
            .Where(name => !LegalPlaceholders.All.ContainsKey(name))
            .Distinct()
            .ToList();

    public static string RenderBody(string markdown, LegalRenderContext context)
    {
        var values = BuildValues(context);
        var filled = PlaceholderPattern().Replace(markdown,
            m => values.TryGetValue(m.Groups[1].Value, out var value) ? value : m.Value);

        return Markdown.ToHtml(filled, Pipeline);
    }

    /// A complete, self-contained HTML file: what is stored per order and
    /// attached to the confirmation email.
    public static string RenderDocument(LegalDocument document, LegalRenderContext context)
    {
        var direction = document.Language == "ar" ? "rtl" : "ltr";
        var title = WebUtility.HtmlEncode(document.Title);

        // Notice the $$""" - This allows { } for CSS and {{ }} for C# variables
        return $$"""
            <!DOCTYPE html>
            <html lang="{{document.Language}}" dir="{{direction}}">
            <head><meta charset="utf-8"><title>{{title}}</title>
            <style>
              body { font-family: Arial, Helvetica, sans-serif; max-width: 800px; margin: 32px auto; padding: 0 16px; line-height: 1.7; color: #1c1917; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #d6d3d1; padding: 6px 8px; text-align: start; }
              footer { margin-top: 40px; font-size: 12px; color: #78716c; }
            </style></head>
            <body>
            <h1>{{title}}</h1>
            {{RenderBody(document.BodyMarkdown, context)}}
            <footer>{{WebUtility.HtmlEncode(document.Type.ToString())}} · v{{WebUtility.HtmlEncode(document.Version)}}</footer>
            </body></html>
            """;
    }

    private static Dictionary<string, string> BuildValues(LegalRenderContext c)
    {
        var culture = c.Language switch
        {
            "tr" => CultureInfo.GetCultureInfo("tr-TR"),
            "en" => CultureInfo.GetCultureInfo("en-US"),
            // ar-EG, not ar-SA: ar-SA defaults to the Hijri calendar.
            _ => CultureInfo.GetCultureInfo("ar-EG")
        };

        string Money(decimal? amount) => amount is { } a ? $"{a.ToString("N2", culture)} {c.Currency}" : "—";

        string? orderDate = null;
        if (c.OrderDateUtc is { } utc)
        {
            var zone = TimeZoneInfo.FindSystemTimeZoneById(c.TimeZoneId);
            orderDate = TimeZoneInfo.ConvertTime(utc, zone).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);
        }

        return new Dictionary<string, string>
        {
            ["SellerName"] = Escape(c.Seller.LegalName),
            ["SellerAddress"] = Escape(c.Seller.Address),
            ["SellerPhone"] = Escape(c.Seller.Phone),
            ["SellerEmail"] = Escape(c.Seller.Email),
            ["SellerKep"] = Escape(c.Seller.KepAddress),
            ["SellerTaxOffice"] = Escape(c.Seller.TaxOffice),
            ["SellerTaxNumber"] = Escape(c.Seller.TaxNumber),
            ["SellerMersis"] = Escape(c.Seller.MersisNumber),
            ["OrderNumber"] = Escape(c.OrderNumber),
            ["OrderDate"] = Escape(orderDate),
            ["CustomerName"] = Escape(c.CustomerName),
            ["CustomerEmail"] = Escape(c.CustomerEmail),
            ["CustomerPhone"] = Escape(c.CustomerPhone),
            ["DeliveryAddress"] = Escape(c.DeliveryAddress),
            ["ShippingMethod"] = Escape(c.ShippingMethod),
            ["ItemsTable"] = ItemsTable(c.Lines, Money),
            ["Subtotal"] = Escape(Money(c.Subtotal)),
            ["Discount"] = Escape(Money(c.Discount)),
            ["Shipping"] = Escape(Money(c.Shipping)),
            ["GiftWrap"] = Escape(Money(c.GiftWrap)),
            ["Total"] = Escape(Money(c.Total)),
            ["WithdrawalDays"] = c.WithdrawalDays.ToString(CultureInfo.InvariantCulture)
        };
    }

    private static string ItemsTable(IReadOnlyList<LegalLine>? lines, Func<decimal?, string> money)
    {
        if (lines is null || lines.Count == 0)
            return "—";

        var builder = new StringBuilder("\n\n| # | Title | Qty | Unit price | Total |\n|---|---|---|---|---|\n");
        for (var i = 0; i < lines.Count; i++)
        {
            var l = lines[i];
            builder.Append($"| {i + 1} | {Escape(l.Title)} | {l.Quantity} | {Escape(money(l.UnitPrice))} | {Escape(money(l.LineTotal))} |\n");
        }

        return builder.Append('\n').ToString();
    }

    /// Values go INTO Markdown, so every Markdown-significant character is
    /// backslash-escaped: a customer named "**Ali**" or "<script>" renders as
    /// exactly that text, never as formatting or markup.
    internal static string Escape(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "—";

        var builder = new StringBuilder(value.Length + 8);
        foreach (var ch in value.Replace('\r', ' ').Replace('\n', ' '))
        {
            if ("\\`*_{}[]()#+-.!|<>~".Contains(ch))
                builder.Append('\\');
            builder.Append(ch);
        }

        return builder.ToString();
    }

    [GeneratedRegex(@"\{\{\s*([A-Za-z]+)\s*\}\}")]
    private static partial Regex PlaceholderPattern();
}

public static class LegalContextFactory
{
    public static LegalRenderContext Generic(string language, StoreOptions store, int withdrawalDays) =>
        new(store.Seller, language, store.Currency, store.TimeZoneId, withdrawalDays);

    public static LegalRenderContext FromOrder(Order o, string language, StoreOptions store, int withdrawalDays) =>
        new(store.Seller, language, o.Total.Currency, store.TimeZoneId, withdrawalDays,
            OrderNumber: o.OrderNumber,
            OrderDateUtc: o.CreatedAtUtc,
            CustomerName: o.ShippingAddress.RecipientName,
            CustomerEmail: o.CustomerEmail,
            CustomerPhone: o.ShippingAddress.Phone,
            DeliveryAddress: FormatAddress(
                o.ShippingAddress.Line1, o.ShippingAddress.Line2, o.ShippingAddress.City,
                o.ShippingAddress.StateOrProvince, o.ShippingAddress.PostalCode, o.ShippingAddress.CountryCode),
            ShippingMethod: o.ShippingMethodName ?? o.ShippingMethodCode,
            Lines: o.Lines.Select(l => new LegalLine(
                l.BookTitleSnapshot, l.Quantity, l.UnitPriceAtPurchase.Amount, l.LineTotal.Amount)).ToList(),
            Subtotal: o.Subtotal.Amount,
            Discount: o.DiscountAmount.Amount,
            Shipping: o.ShippingCost.Amount,
            GiftWrap: o.GiftWrapFee.Amount,
            Total: o.Total.Amount);

    public static string FormatAddress(params string?[] parts) =>
        string.Join(", ", parts.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => p!.Trim()));
}