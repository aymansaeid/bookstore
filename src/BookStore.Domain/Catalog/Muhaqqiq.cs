using BookStore.Domain.Books;
using BookStore.Domain.Common;

namespace BookStore.Domain.Catalog;

/// The scholar who established and annotated a heritage text (المحقق).
/// Deliberately not translated in code: the team, the spec and the
/// customers all use the Arabic term, and "editor" loses its meaning.
public sealed class Muhaqqiq : AggregateRoot<int>
{
    public const int MaxNameLength = 200;
    public const int MaxBioLength = 2000;
    public const int MaxSpecialties = 10;
    public const int MaxSpecialtyLength = 50;

    public string Name { get; private set; } = string.Empty;
    public Slug Slug { get; private set; } = null!;
    public string? Bio { get; private set; }

    private readonly List<string> _specialties = [];
    public IReadOnlyCollection<string> Specialties => _specialties.AsReadOnly();

    /// Shown in the home page's «أعلام المحققين» section (spec 5.1, item 9).
    public bool IsFeatured { get; private set; }

    public int DisplayOrder { get; private set; }
    public bool IsActive { get; private set; }

    private Muhaqqiq() { } // EF Core

    public static Muhaqqiq Create(
        string name, Slug slug, string? bio, IEnumerable<string> specialties, bool isFeatured, int displayOrder)
    {
        var muhaqqiq = new Muhaqqiq { Slug = slug, IsActive = true };
        muhaqqiq.Update(name, bio, specialties, isFeatured, displayOrder);
        return muhaqqiq;
    }

    public void Update(string name, string? bio, IEnumerable<string> specialties, bool isFeatured, int displayOrder)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required.", nameof(name));
        if (name.Trim().Length > MaxNameLength)
            throw new ArgumentException($"Name can be at most {MaxNameLength} characters.", nameof(name));

        var trimmedBio = string.IsNullOrWhiteSpace(bio) ? null : bio.Trim();
        if (trimmedBio is { Length: > MaxBioLength })
            throw new ArgumentException($"Bio can be at most {MaxBioLength} characters.", nameof(bio));

        var cleaned = specialties
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (cleaned.Count > MaxSpecialties)
            throw new ArgumentException($"At most {MaxSpecialties} specialties.", nameof(specialties));
        if (cleaned.Any(s => s.Length > MaxSpecialtyLength))
            throw new ArgumentException($"Each specialty can be at most {MaxSpecialtyLength} characters.", nameof(specialties));

        Name = name.Trim();
        Bio = trimmedBio;
        IsFeatured = isFeatured;
        DisplayOrder = displayOrder;

        _specialties.Clear();
        _specialties.AddRange(cleaned);
    }

    public void Activate() => IsActive = true;
    public void Deactivate() => IsActive = false;
}