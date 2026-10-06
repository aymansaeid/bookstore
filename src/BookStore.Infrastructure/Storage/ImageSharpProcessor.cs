using BookStore.Application.Abstractions.Storage;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace BookStore.Infrastructure.Storage;

public sealed class ImageSharpProcessor : IImageProcessor
{
    private const int MasterQuality = 85;
    private const int VariantQuality = 80;

    public async Task<ProcessedImage> ProcessAsync(Stream input, CancellationToken ct = default)
    {
        // 1. Header only: dimensions without decoding a single pixel. This is
        // what stops a decompression bomb before it can allocate gigabytes.
        ImageInfo info;
        try
        {
            info = await Image.IdentifyAsync(input, ct);
        }
        catch (Exception ex) when (ex is UnknownImageFormatException or InvalidImageContentException)
        {
            throw new InvalidImageException("The file is not a readable image.", ex);
        }

        if (info.Width > ImageRules.MaxSourceDimension || info.Height > ImageRules.MaxSourceDimension)
            throw new InvalidImageException(
                $"Images can be at most {ImageRules.MaxSourceDimension}px on each side.");

        if (info.Width < ImageRules.MinSourceWidth)
            throw new InvalidImageException(
                $"Images must be at least {ImageRules.MinSourceWidth}px wide.");

        input.Position = 0;

        Image image;
        try
        {
            image = await Image.LoadAsync(input, ct);
        }
        catch (Exception ex) when (ex is UnknownImageFormatException or InvalidImageContentException)
        {
            throw new InvalidImageException("The image is damaged and can't be read.", ex);
        }

        using (image)
        {
            // 2. Phone photos are often stored sideways with an "orientation"
            // flag. Apply it, so stripping metadata below doesn't leave the
            // image visibly rotated.
            image.Mutate(x => x.AutoOrient());

            // 3. Privacy: phone photos usually carry the GPS location where
            // they were taken. Never publish that.
            image.Metadata.ExifProfile = null;
            image.Metadata.XmpProfile = null;
            image.Metadata.IptcProfile = null;

            // 4. Cap the master.
            if (Math.Max(image.Width, image.Height) > ImageRules.MaxMasterSize)
            {
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new Size(ImageRules.MaxMasterSize, ImageRules.MaxMasterSize),
                    Mode = ResizeMode.Max
                }));
            }

            var master = await EncodeAsync(image, MasterQuality, ct);

            // 5. Variants: only sizes smaller than the master. Never upscale.
            var variants = new List<ImageVariant>();
            foreach (var width in ImageRules.VariantWidths.Where(w => w < image.Width))
            {
                using var resized = image.Clone(x => x.Resize(width, 0)); // 0 = keep aspect ratio
                variants.Add(new ImageVariant(width, await EncodeAsync(resized, VariantQuality, ct)));
            }

            return new ProcessedImage(master, image.Width, image.Height, variants);
        }
    }

    private static async Task<MemoryStream> EncodeAsync(Image image, int quality, CancellationToken ct)
    {
        var stream = new MemoryStream();
        await image.SaveAsWebpAsync(stream, new WebpEncoder { Quality = quality }, ct);
        stream.Position = 0;
        return stream;
    }
}