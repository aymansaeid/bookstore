using BookStore.Domain.Common;

namespace BookStore.Domain.Catalog;

public sealed class MuhaqqiqTranslation
{
    public Language Language { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Bio { get; private set; }

    private readonly List<string> _specialties = [];
    public IReadOnlyCollection<string> Specialties => _specialties.AsReadOnly();

    public DateTimeOffset UpdatedAtUtc { get; private set; }

    private MuhaqqiqTranslation() { } // EF Core

    internal static MuhaqqiqTranslation Create(Language language)
    {
        TranslationRules.EnsureTranslatable(language);
        return new MuhaqqiqTranslation { Language = language };
    }

    internal void Update(string name, string? bio, IEnumerable<string>? specialties)
    {
        var cleanName = TranslationRules.Required(name, Muhaqqiq.MaxNameLength, "Name");
        var cleanBio = TranslationRules.Optional(bio, Muhaqqiq.MaxBioLength, "Bio");
        var cleanSpecialties = TranslationRules.List(specialties, Muhaqqiq.MaxSpecialties, Muhaqqiq.MaxSpecialtyLength, "Specialties");

        Name = cleanName;
        Bio = cleanBio;
        _specialties.Clear();
        _specialties.AddRange(cleanSpecialties);
        UpdatedAtUtc = DateTimeOffset.UtcNow;
    }
}