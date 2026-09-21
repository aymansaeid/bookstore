namespace BookStore.Application.Common;

public sealed class StoreOptions
{
    public const string SectionName = "Store";

    // ISO 4217 code. Every price in the store (books, shipping) is in this
    // currency. Changing it later means repricing everything, so pick once.
    public string Currency { get; init; } = "USD";
}