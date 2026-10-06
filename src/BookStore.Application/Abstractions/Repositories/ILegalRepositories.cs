using BookStore.Domain.Legal;

namespace BookStore.Application.Abstractions.Repositories;

public interface ILegalDocumentRepository
{
    Task<LegalDocument?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<LegalDocument?> GetPublishedAsync(LegalDocumentType type, string language, CancellationToken ct = default);
    Task<IReadOnlyList<LegalDocument>> ListAsync(LegalDocumentType? type, string? language, CancellationToken ct = default);
    Task<bool> VersionExistsAsync(LegalDocumentType type, string language, string version, CancellationToken ct = default);
    void Add(LegalDocument document);
}

public interface IOrderLegalRecordRepository
{
    Task<IReadOnlyList<OrderLegalRecord>> ListByOrderNumberAsync(string orderNumber, CancellationToken ct = default);
    void Add(OrderLegalRecord record);
}