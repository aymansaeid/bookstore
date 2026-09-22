namespace BookStore.Application.Abstractions.Storage;

public sealed record StoredFile(string StorageKey, long SizeBytes, string ContentType);

public interface IFileStorage
{
    /// Returns the storage key. Implementations generate the key themselves;
    /// a caller-supplied filename must never influence the stored path.
    Task<StoredFile> SaveAsync(Stream content, string contentType, string folder, CancellationToken ct = default);

    Task DeleteAsync(string storageKey, CancellationToken ct = default);

    /// Turns a storage key into something a browser can load. Local disk
    /// returns a relative path; cloud storage would return a full or signed URL.
    string GetPublicUrl(string storageKey);
}