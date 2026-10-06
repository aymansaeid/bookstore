using BookStore.Application.Common;
using BookStore.Domain.Legal;

namespace BookStore.Application.Legal;

public static class LegalErrors
{
    public static Error NotFound(int id) =>
        Error.NotFound("Legal.NotFound", $"Legal document {id} was not found.");

    public static Error NotPublished(LegalDocumentType type, string language) =>
        Error.NotFound("Legal.NotPublished", $"No published {type} in '{language}'.");

    public static Error DuplicateVersion(string version) =>
        Error.Conflict("Legal.DuplicateVersion", $"Version '{version}' already exists for this document and language.");

    public static Error NotADraft =>
        Error.Conflict("Legal.NotADraft",
            "Published and archived versions are frozen. Create a new version to change the text.");

    public static Error UnknownPlaceholders(IEnumerable<string> names) =>
        Error.Validation("Legal.UnknownPlaceholders",
            $"Unknown placeholder(s): {string.Join(", ", names.Select(n => "{{" + n + "}}"))}. Fix them before publishing.");

    public static Error Invalid(string message) => Error.Validation("Legal.Invalid", message);
}