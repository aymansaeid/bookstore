using BookStore.Application.Catalog.Search;
using BookStore.Domain.Books;
using BookStore.Domain.Catalog;
using FluentAssertions;

namespace BookStore.Application.Tests.Catalog;

public class SearchTermBuilderTests
{
    [Fact]
    public void EmptyQuery_HasNoTextFilter()
    {
        var built = SearchTermBuilder.Build("   ", [], []);

        built.Phrase.Should().BeNull();
        built.Terms.Should().BeEmpty();
    }

    [Fact]
    public void MuhaqqiqName_MatchesRegardlessOfHamza()
    {
        var arnaut = Muhaqqiq.Create("شعيب الأرناؤوط", Slug.Create("arnaut"), null, [], true, 0);

        // Typed without hamza, as most people do on a phone keyboard.
        var built = SearchTermBuilder.Build("الارناووط", [], [arnaut]);

        built.Terms.Should().ContainSingle()
            .Which.MatchingMuhaqqiqIds.Should().ContainSingle();
    }

    [Fact]
    public void UnrelatedName_DoesNotMatch()
    {
        var arnaut = Muhaqqiq.Create("شعيب الأرناؤوط", Slug.Create("arnaut"), null, [], true, 0);

        var built = SearchTermBuilder.Build("تفسير", [], [arnaut]);

        built.Terms.Single().MatchingMuhaqqiqIds.Should().BeEmpty();
    }

    [Fact]
    public void CategoryName_MatchesWithoutTheArticle()
    {
        var hadith = Category.Create("الحديث وعلومه", Slug.Create("hadith"), "ح", null, null, 0);

        var built = SearchTermBuilder.Build("حديث", [hadith], []);

        built.Terms.Single().MatchingCategoryIds.Should().ContainSingle();
    }
}