using BookStore.Domain.Common;

namespace BookStore.Domain.Shipping;

public sealed record ShippingOptionInput(
    string Code, string Name, string? Carrier, decimal Price, int? MinDays, int? MaxDays);

/// A paid extra next to a zone's standard delivery, e.g. express. Owned by
/// ShippingZone. Identity-keyed, so a full replace (clear + add) never hits
/// EF's "same key already tracked" problem.
public sealed class ShippingOption : Entity<int>
{
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string? Carrier { get; private set; }

    /// In the zone's currency.
    public decimal Price { get; private set; }

    public int? MinDays { get; private set; }
    public int? MaxDays { get; private set; }
    public int DisplayOrder { get; private set; }

    private ShippingOption() { } // EF Core

    internal static ShippingOption Create(ShippingOptionInput input, int displayOrder) =>
        new()
        {
            Code = input.Code.Trim().ToLowerInvariant(),
            Name = input.Name.Trim(),
            Carrier = string.IsNullOrWhiteSpace(input.Carrier) ? null : input.Carrier.Trim(),
            Price = input.Price,
            MinDays = input.MinDays,
            MaxDays = input.MaxDays,
            DisplayOrder = displayOrder
        };
}