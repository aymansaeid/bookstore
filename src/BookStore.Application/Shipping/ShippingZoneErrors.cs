using BookStore.Application.Common;

namespace BookStore.Application.Shipping;

public static class ShippingZoneErrors
{
    public static Error NotFound(int id) =>
        Error.NotFound("ShippingZone.NotFound", $"Shipping zone {id} was not found.");

    public static Error DuplicateName(string name) =>
        Error.Conflict("ShippingZone.DuplicateName", $"A shipping zone named '{name}' already exists.");

    public static Error CountriesAlreadyAssigned(IEnumerable<string> conflicts) =>
        Error.Conflict("ShippingZone.CountriesAlreadyAssigned",
            $"These countries already belong to another zone: {string.Join(", ", conflicts)}.");
}