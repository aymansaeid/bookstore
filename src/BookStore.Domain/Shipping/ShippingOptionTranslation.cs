using BookStore.Domain.Common;

namespace BookStore.Domain.Shipping;

/// An extra option's name in one non-Arabic language, keyed by the option's
/// CODE: a delivery update that keeps the code keeps the translation.
public sealed class ShippingOptionTranslation
{
    public string Code { get; private set; } = string.Empty;
    public Language Language { get; private set; }
    public string Name { get; private set; } = string.Empty;

    private ShippingOptionTranslation() { } // EF Core

    internal static ShippingOptionTranslation Create(string code, Language language, string name) =>
        new() { Code = code, Language = language, Name = name };

    internal void Rename(string name) => Name = name;
}