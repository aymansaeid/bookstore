using BookStore.Application.Abstractions.Queries;
using BookStore.Domain.Catalog;
using BookStore.Domain.Common;

namespace BookStore.Application.Catalog.Search;

public sealed record BuiltSearch(string? Phrase, IReadOnlyList<SearchTerm> Terms);

public static class SearchTermBuilder
{
    public static BuiltSearch Build(
        string? query, IReadOnlyList<Category> activeCategories, IReadOnlyList<Muhaqqiq> activeMuhaqqiqs)
    {
        var phrase = SearchNormalizer.Normalize(query);
        var tokens = SearchNormalizer.Tokenize(phrase);

        if (tokens.Count == 0)
            return new BuiltSearch(null, []);

        // Every name in every language: "Hadith" and "Hadis" find the same category.
        var categoryNames = activeCategories
            .Select(c => (Category: c, Names: AllNames(c.Name, c.Translations.Select(t => t.Name))))
            .ToList();

        var muhaqqiqNames = activeMuhaqqiqs
            .Select(m => (m.Id, Names: AllNames(m.Name, m.Translations.Select(t => t.Name))))
            .ToList();

        var terms = tokens.Select(token =>
        {
            var directCategoryIds = categoryNames
                .Where(x => x.Names.Any(n => n.Contains(token, StringComparison.Ordinal)))
                .Select(x => x.Category.Id)
                .ToHashSet();

            var categoryIds = activeCategories
                .Where(c => directCategoryIds.Contains(c.Id)
                            || (c.ParentId is { } parentId && directCategoryIds.Contains(parentId)))
                .Select(c => c.Id)
                .ToList();

            var muhaqqiqIds = muhaqqiqNames
                .Where(x => x.Names.Any(n => n.Contains(token, StringComparison.Ordinal)))
                .Select(x => x.Id)
                .ToList();

            return new SearchTerm(token, categoryIds, muhaqqiqIds);
        }).ToList();

        return new BuiltSearch(phrase, terms);
    }

    private static IReadOnlyList<string> AllNames(string source, IEnumerable<string> translations) =>
        translations.Prepend(source).Select(SearchNormalizer.Normalize).Where(n => n.Length > 0).ToList();
}