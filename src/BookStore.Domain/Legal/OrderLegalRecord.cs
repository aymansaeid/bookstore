using System.Security.Cryptography;
using System.Text;
using BookStore.Domain.Common;

namespace BookStore.Domain.Legal;

/// The exact document a buyer saw for one order, rendered with that order's
/// details. Never edited, never anonymised: it's the seller's legal record.
/// Keyed by order number, which exists before the order is saved, so it's
/// written in the SAME transaction as the order itself.
public sealed class OrderLegalRecord : AggregateRoot<int>
{
    public string OrderNumber { get; private set; } = string.Empty;
    public LegalDocumentType DocumentType { get; private set; }
    public string Language { get; private set; } = string.Empty;
    public string Version { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string RenderedHtml { get; private set; } = string.Empty;

    /// SHA-256 of RenderedHtml: proof later that the stored copy is unchanged.
    public string ContentSha256 { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; private set; }

    private OrderLegalRecord() { } // EF Core

    public static OrderLegalRecord Create(string orderNumber, LegalDocument document, string renderedHtml) =>
        new()
        {
            OrderNumber = orderNumber,
            DocumentType = document.Type,
            Language = document.Language,
            Version = document.Version,
            Title = document.Title,
            RenderedHtml = renderedHtml,
            ContentSha256 = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(renderedHtml))),
            CreatedAtUtc = DateTimeOffset.UtcNow
        };
}