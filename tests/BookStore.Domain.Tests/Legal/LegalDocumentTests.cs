using BookStore.Domain.Legal;
using FluentAssertions;

namespace BookStore.Domain.Tests.Legal;

public class LegalDocumentTests
{
    private static LegalDocument Draft() =>
        LegalDocument.CreateDraft(LegalDocumentType.DistanceSalesContract, "tr", "2026-10", "Mesafeli Satış Sözleşmesi", "Metin");

    [Fact]
    public void PublishedVersion_IsFrozen()
    {
        var document = Draft();
        document.Publish();

        var act = () => document.EditDraft("New title", "New text");

        act.Should().Throw<InvalidOperationException>().WithMessage("*new version*");
    }

    [Fact]
    public void OnlyDrafts_CanBePublished()
    {
        var document = Draft();
        document.Publish();

        var act = () => document.Publish();
        act.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData("fr")]
    [InlineData("")]
    public void UnsupportedLanguage_IsRejected(string language)
    {
        var act = () => LegalDocument.CreateDraft(LegalDocumentType.PrivacyNotice, language, "1", "T", "B");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Record_HashMatchesContent()
    {
        var document = Draft();
        var record = OrderLegalRecord.Create("BK-1", document, "<p>Metin</p>");

        record.ContentSha256.Should().HaveLength(64);
        OrderLegalRecord.Create("BK-1", document, "<p>Metin</p>").ContentSha256.Should().Be(record.ContentSha256);
        OrderLegalRecord.Create("BK-1", document, "<p>Değişti</p>").ContentSha256.Should().NotBe(record.ContentSha256);
    }
}