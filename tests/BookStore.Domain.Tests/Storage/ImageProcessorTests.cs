using BookStore.Application.Abstractions.Storage;
using BookStore.Infrastructure.Storage;
using FluentAssertions;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;
using SixLabors.ImageSharp.PixelFormats;

namespace BookStore.Domain.Tests.Storage;

public class ImageProcessorTests
{
    private readonly ImageSharpProcessor _processor = new();

    private static MemoryStream Jpeg(int width, int height, Action<Image>? configure = null)
    {
        using var image = new Image<Rgba32>(width, height, new Rgba32(140, 30, 30));
        configure?.Invoke(image);

        var stream = new MemoryStream();
        image.SaveAsJpeg(stream);
        stream.Position = 0;
        return stream;
    }

    [Fact]
    public async Task OnlySmallerVariants_AreCreated()
    {
        using var processed = await _processor.ProcessAsync(Jpeg(1000, 1500));

        processed.Width.Should().Be(1000);
        processed.Height.Should().Be(1500);
        processed.Variants.Select(v => v.Width).Should().Equal(300, 600); // no upscaled 1200
    }

    [Fact]
    public async Task Master_IsCappedAndKeepsAspectRatio()
    {
        using var processed = await _processor.ProcessAsync(Jpeg(3000, 1000));

        processed.Width.Should().Be(ImageRules.MaxMasterSize);
        processed.Height.Should().Be(800);
    }

    [Fact]
    public async Task Output_IsWebp()
    {
        using var processed = await _processor.ProcessAsync(Jpeg(800, 1200));

        Image.DetectFormat(processed.Master).Name.Should().Be("WEBP");
    }

    [Fact]
    public async Task Metadata_IsStripped()
    {
        var source = Jpeg(800, 1200, image =>
        {
            image.Metadata.ExifProfile = new ExifProfile();
            image.Metadata.ExifProfile.SetValue(ExifTag.Software, "Phone camera");
        });

        using var processed = await _processor.ProcessAsync(source);
        using var output = await Image.LoadAsync(processed.Master);

        output.Metadata.ExifProfile.Should().BeNull();
    }

    [Fact]
    public async Task OversizedDimensions_AreRejectedBeforeDecoding()
    {
        var act = () => _processor.ProcessAsync(Jpeg(ImageRules.MaxSourceDimension + 1, 10));
        await act.Should().ThrowAsync<InvalidImageException>();
    }

    [Fact]
    public async Task NonImage_IsRejected()
    {
        var act = () => _processor.ProcessAsync(new MemoryStream("not an image at all"u8.ToArray()));
        await act.Should().ThrowAsync<InvalidImageException>();
    }
}