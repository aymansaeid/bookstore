namespace BookStore.Application.Returns;

public sealed class ReturnOptions
{
    public const string SectionName = "Returns";

    public int WindowDays { get; init; } = 14;

    /// Added to the window when an order was never marked Delivered.
    public int TransitAllowanceDays { get; init; } = 7;

    /// Used when the admin approves without writing custom instructions.
    public string DefaultReturnInstructions { get; init; } =
        "Please send the book back to our return address, with your order number written inside the parcel.";
}