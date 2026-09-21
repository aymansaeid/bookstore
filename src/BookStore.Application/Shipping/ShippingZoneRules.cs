using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;

namespace BookStore.Application.Shipping;

internal static class ShippingZoneRules
{
    /// Checks name uniqueness and "one country, one zone" against every
    /// OTHER zone. excludeZoneId lets an update compare against everyone
    /// except itself.
    ///
    /// Known gap: two admins saving overlapping zones at the exact same
    /// instant could both pass. With one admin that's not a real scenario;
    /// if it ever becomes one, the fix is a DB-level constraint.
    public static async Task<Error?> CheckAsync(
        IShippingZoneRepository repository,
        string name,
        IEnumerable<string> countryCodes,
        int? excludeZoneId,
        CancellationToken ct)
    {
        var otherZones = (await repository.ListAsync(includeInactive: true, ct))
            .Where(z => z.Id != excludeZoneId)
            .ToList();

        var trimmedName = name.Trim();
        if (otherZones.Any(z => string.Equals(z.Name, trimmedName, StringComparison.OrdinalIgnoreCase)))
            return ShippingZoneErrors.DuplicateName(trimmedName);

        var requested = countryCodes.Select(c => c.Trim().ToUpperInvariant()).ToHashSet();

        var conflicts = otherZones
            .SelectMany(z => z.CountryCodes
                .Where(requested.Contains)
                .Select(code => $"{code} (in '{z.Name}')"))
            .ToList();

        return conflicts.Count > 0 ? ShippingZoneErrors.CountriesAlreadyAssigned(conflicts) : null;
    }
}