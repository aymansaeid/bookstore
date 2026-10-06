using BookStore.Application.Common;
using BookStore.Application.Legal;
using FluentAssertions;

namespace BookStore.Application.Tests.Legal;

public class LegalTemplateRendererTests
{
    private static LegalRenderContext Context(string customerName = "Ahmet Yılmaz") =>
        new(new SellerSettings { LegalName = "Kitap Efendi Ltd." }, "tr", "TRY", "Europe/Istanbul", 14,
            OrderNumber: "BK-1", CustomerName: customerName,
            Lines: [new LegalLine("Zad al-Maad", 1, 2400m, 2400m)],
            Subtotal: 2400m, Discount: 0m, Shipping: 0m, GiftWrap: 0m, Total: 2400m);

    [Fact]
    public void FillsPlaceholders()
    {
        var html = LegalTemplateRenderer.RenderBody(
            "Satıcı: {{SellerName}}. Alıcı: {{CustomerName}}. Cayma süresi {{WithdrawalDays}} gün.", Context());

        html.Should().Contain("Kitap Efendi Ltd").And.Contain("Ahmet Yılmaz").And.Contain("14 gün");
    }

    [Fact]
    public void CustomerValues_CannotInjectMarkupOrFormatting()
    {
        var html = LegalTemplateRenderer.RenderBody("Alıcı: {{CustomerName}}", Context("**Ali** <script>alert(1)</script>"));

        html.Should().Contain("**Ali**");             // shown literally, not bold
        html.Should().NotContain("<script>");          // never live markup
        html.Should().Contain("&lt;script&gt;");
    }

    [Fact]
    public void RawHtmlInTemplate_IsRenderedAsText()
    {
        var html = LegalTemplateRenderer.RenderBody("<b>bold?</b> {{OrderNumber}}", Context());

        html.Should().NotContain("<b>");
    }

    [Fact]
    public void ItemsTable_RendersAsTable()
    {
        var html = LegalTemplateRenderer.RenderBody("{{ItemsTable}}", Context());

        html.Should().Contain("<table>").And.Contain("Zad al");
    }

    [Fact]
    public void UnknownPlaceholders_AreDetected()
    {
        LegalTemplateRenderer.UnknownPlaceholders("{{CustomerName}} {{CustomerNmae}} {{Totl}}")
            .Should().BeEquivalentTo("CustomerNmae", "Totl");
    }
}