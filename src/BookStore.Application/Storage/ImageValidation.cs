namespace BookStore.Application.Abstractions.Storage;

public static class ImageValidation
{
    public const long MaxSizeBytes = 5 * 1024 * 1024;

    public static readonly string[] AllowedContentTypes = ["image/jpeg", "image/png", "image/webp"];

    /// Checks the file's magic bytes. An extension or a client-sent
    /// Content-Type is just a claim; this reads what the file actually is.
    public static bool HasValidImageSignature(ReadOnlySpan<byte> header, out string detectedContentType)
    {
        detectedContentType = string.Empty;

        // JPEG: FF D8 FF
        if (header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            detectedContentType = "image/jpeg";
            return true;
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (header.Length >= 8 &&
            header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
            header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A)
        {
            detectedContentType = "image/png";
            return true;
        }

        // WebP: "RIFF" .... "WEBP"
        if (header.Length >= 12 &&
            header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
            header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50)
        {
            detectedContentType = "image/webp";
            return true;
        }

        return false;
    }

    public static string ExtensionFor(string contentType) => contentType switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        _ => throw new ArgumentOutOfRangeException(nameof(contentType))
    };
}