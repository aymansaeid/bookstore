using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Legal;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class LegalDocumentRepository(BookStoreDbContext dbContext) : ILegalDocumentRepository
{
    public Task<LegalDocument?> GetByIdAsync(int id, CancellationToken ct = default) =>
        dbContext.LegalDocuments.FirstOrDefaultAsync(d => d.Id == id, ct);

    public Task<LegalDocument?> GetPublishedAsync(LegalDocumentType type, string language, CancellationToken ct = default) =>
        dbContext.LegalDocuments.FirstOrDefaultAsync(
            d => d.Type == type && d.Language == language && d.Status == LegalDocumentStatus.Published, ct);

    public async Task<IReadOnlyList<LegalDocument>> ListAsync(
        LegalDocumentType? type, string? language, CancellationToken ct = default)
    {
        var query = dbContext.LegalDocuments.AsNoTracking();

        if (type is { } t)
            query = query.Where(d => d.Type == t);
        if (!string.IsNullOrWhiteSpace(language))
            query = query.Where(d => d.Language == language);

        return await query.OrderBy(d => d.Type).ThenBy(d => d.Language).ThenByDescending(d => d.CreatedAtUtc).ToListAsync(ct);
    }

    public Task<bool> VersionExistsAsync(LegalDocumentType type, string language, string version, CancellationToken ct = default) =>
        dbContext.LegalDocuments.AnyAsync(d => d.Type == type && d.Language == language && d.Version == version, ct);

    public void Add(LegalDocument document) => dbContext.LegalDocuments.Add(document);
}

public sealed class OrderLegalRecordRepository(BookStoreDbContext dbContext) : IOrderLegalRecordRepository
{
    public async Task<IReadOnlyList<OrderLegalRecord>> ListByOrderNumberAsync(string orderNumber, CancellationToken ct = default) =>
        await dbContext.OrderLegalRecords
            .AsNoTracking()
            .Where(r => r.OrderNumber == orderNumber)
            .OrderBy(r => r.DocumentType)
            .ToListAsync(ct);

    public void Add(OrderLegalRecord record) => dbContext.OrderLegalRecords.Add(record);
}