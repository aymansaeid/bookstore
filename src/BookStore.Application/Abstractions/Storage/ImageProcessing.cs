namespace BookStore.Application.Abstractions.Storage;

public static class ImageRules
{
    /// Spec 8.4. Only sizes SMALLER than the master are generated.
    public static readonly IReadOnlyList<int> VariantWidths = [300, 600, 1200];

    /// The stored "original" is capped here: nobody needs 6000px on a book page.
    public const int MaxMasterSize = 2400;

    /// Decompression-bomb guard: checked from the header, before decoding.
    public const int MaxSourceDimension = 8000;

    /// Smaller than this looks broken on the book page.
    public const int MinSourceWidth = 200;
}

public sealed record ImageVariant(int Width, Stream Content);

public sealed class ProcessedImage(Stream master, int width, int height, IReadOnlyList<ImageVariant> variants)
    : IDisposable
{
    public Stream Master { get; } = master;
    public int Width { get; } = width;
    public int Height { get; } = height;
    public IReadOnlyList<ImageVariant> Variants { get; } = variants;

    public void Dispose()
    {
        Master.Dispose();
        foreach (var variant in Variants)
            variant.Content.Dispose();
    }
}

public sealed class InvalidImageException(string message, Exception? inner = null) : Exception(message, inner);

public interface IImageProcessor
{
    /// Validates, auto-rotates, strips metadata, and returns a WebP master
    /// plus smaller WebP variants. Throws InvalidImageException for anything
    /// it won't accept. The input stream must be seekable.
    Task<ProcessedImage> ProcessAsync(Stream input, CancellationToken ct = default);
}