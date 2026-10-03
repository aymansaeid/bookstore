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

        // Nothing usable (empty, or only single letters): no text filter.
        if (tokens.Count == 0)
            return new BuiltSearch(null, []);

        var categoryNames = activeCategories
            .Select(c => (Category: c, Name: SearchNormalizer.Normalize(c.Name)))
            .ToList();

        var muhaqqiqNames = activeMuhaqqiqs
            .Select(m => (m.Id, Name: SearchNormalizer.Normalize(m.Name)))
            .ToList();

        var terms = tokens.Select(token =>
        {
            var directCategoryIds = categoryNames
                .Where(x => x.Name.Contains(token, StringComparison.Ordinal))
                .Select(x => x.Category.Id)
                .ToHashSet();

            // A matching top-level category also matches its subcategories' books.
            var categoryIds = activeCategories
                .Where(c => directCategoryIds.Contains(c.Id)
                            || (c.ParentId is { } parentId && directCategoryIds.Contains(parentId)))
                .Select(c => c.Id)
                .ToList();

            var muhaqqiqIds = muhaqqiqNames
                .Where(x => x.Name.Contains(token, StringComparison.Ordinal))
                .Select(x => x.Id)
                .ToList();

            return new SearchTerm(token, categoryIds, muhaqqiqIds);
        }).ToList();

        return new BuiltSearch(phrase, terms);
    }
}