using BookStore.Domain.Legal;

namespace BookStore.Application.Legal;

public sealed record PublishedLegalDocumentDto(
    LegalDocumentType Type, string Language, string Version, string Title, string Html, DateTimeOffset PublishedAtUtc);

public sealed record RenderedLegalDocumentDto(LegalDocumentType Type, string Version, string Title, string Html);

public sealed record CheckoutLegalPreviewDto(
    RenderedLegalDocumentDto? PreInformationForm, RenderedLegalDocumentDto? DistanceSalesContract);

public sealed record OrderLegalRecordDto(
    LegalDocumentType Type, string Language, string Version, string Title,
    string Html, string ContentSha256, DateTimeOffset CreatedAtUtc);

public sealed record AdminLegalDocumentDto(
    int Id, LegalDocumentType Type, string Language, string Version, string Title, string BodyMarkdown,
    LegalDocumentStatus Status, DateTimeOffset CreatedAtUtc, DateTimeOffset? PublishedAtUtc, DateTimeOffset? ArchivedAtUtc,
    IReadOnlyList<string> UnknownPlaceholders);

public static class LegalMappings
{
    public static AdminLegalDocumentDto ToAdminDto(this LegalDocument d) =>
        new(d.Id, d.Type, d.Language, d.Version, d.Title, d.BodyMarkdown, d.Status,
            d.CreatedAtUtc, d.PublishedAtUtc, d.ArchivedAtUtc,
            LegalTemplateRenderer.UnknownPlaceholders(d.BodyMarkdown));

    public static OrderLegalRecordDto ToDto(this OrderLegalRecord r) =>
        new(r.DocumentType, r.Language, r.Version, r.Title, r.RenderedHtml, r.ContentSha256, r.CreatedAtUtc);
}