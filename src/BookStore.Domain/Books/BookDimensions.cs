using BookStore.Domain.Common;

namespace BookStore.Domain.Books;

/// Shipping dimensions. Grams and millimetres: integers only, so no
/// floating-point rounding surprises when a carrier computes volumetric weight.
public sealed class BookDimensions : ValueObject
{
    public int WeightGrams { get; }
    public int HeightMm { get; }
    public int WidthMm { get; }
    public int DepthMm { get; }

    private BookDimensions(int weightGrams, int heightMm, int widthMm, int depthMm)
    {
        WeightGrams = weightGrams;
        HeightMm = heightMm;
        WidthMm = widthMm;
        DepthMm = depthMm;
    }

    public static BookDimensions Create(int weightGrams, int heightMm, int widthMm, int depthMm)
    {
        if (weightGrams is <= 0 or > 50_000)
            throw new ArgumentOutOfRangeException(nameof(weightGrams), "Weight must be between 1g and 50kg.");
        if (heightMm is <= 0 or > 2_000)
            throw new ArgumentOutOfRangeException(nameof(heightMm), "Height must be between 1mm and 2000mm.");
        if (widthMm is <= 0 or > 2_000)
            throw new ArgumentOutOfRangeException(nameof(widthMm), "Width must be between 1mm and 2000mm.");
        if (depthMm is <= 0 or > 1_000)
            throw new ArgumentOutOfRangeException(nameof(depthMm), "Depth must be between 1mm and 1000mm.");

        return new BookDimensions(weightGrams, heightMm, widthMm, depthMm);
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return WeightGrams;
        yield return HeightMm;
        yield return WidthMm;
        yield return DepthMm;
    }
}