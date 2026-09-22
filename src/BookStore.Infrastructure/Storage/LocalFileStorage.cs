using BookStore.Application.Abstractions.Storage;
using Microsoft.Extensions.Options;

namespace BookStore.Infrastructure.Storage;

public sealed class LocalFileStorageOptions
{
    public const string SectionName = "LocalFileStorage";

    public string RootPath { get; init; } = "wwwroot/uploads";
    public string PublicBaseUrl { get; init; } = "/uploads";
}

public sealed class LocalFileStorage(IOptions<LocalFileStorageOptions> options) : IFileStorage
{
    private readonly LocalFileStorageOptions _options = options.Value;

    public async Task<StoredFile> SaveAsync(
        Stream content, string contentType, string folder, CancellationToken ct = default)
    {
        // The key is generated here, never derived from a user-supplied
        // filename, so path traversal and collisions are impossible.
        var fileName = $"{Guid.NewGuid():N}{ImageValidation.ExtensionFor(contentType)}";
        var storageKey = $"{folder}/{fileName}";

        var absoluteDirectory = Path.Combine(_options.RootPath, folder);
        Directory.CreateDirectory(absoluteDirectory);

        var absolutePath = Path.Combine(absoluteDirectory, fileName);

        await using (var fileStream = File.Create(absolutePath))
        {
            await content.CopyToAsync(fileStream, ct);
        }

        return new StoredFile(storageKey, new FileInfo(absolutePath).Length, contentType);
    }

    public Task DeleteAsync(string storageKey, CancellationToken ct = default)
    {
        var absolutePath = ResolveSafePath(storageKey);

        if (File.Exists(absolutePath))
            File.Delete(absolutePath);

        return Task.CompletedTask;
    }

    public string GetPublicUrl(string storageKey) => $"{_options.PublicBaseUrl}/{storageKey}";

    /// Defence in depth: even though we generate every key ourselves, this
    /// verifies the resolved path stays inside the upload root, so a bad
    /// row in the database can't be used to delete arbitrary files.
    private string ResolveSafePath(string storageKey)
    {
        var root = Path.GetFullPath(_options.RootPath);
        var resolved = Path.GetFullPath(Path.Combine(root, storageKey));

        if (!resolved.StartsWith(root, StringComparison.Ordinal))
            throw new InvalidOperationException("Resolved path escapes the storage root.");

        return resolved;
    }
}