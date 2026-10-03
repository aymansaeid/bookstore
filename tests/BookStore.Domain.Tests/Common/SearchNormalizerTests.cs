using BookStore.Domain.Common;
using FluentAssertions;

namespace BookStore.Domain.Tests.Common;

public class SearchNormalizerTests
{
    [Theory]
    [InlineData("زَادُ المَعَاد", "زاد المعاد")]        // harakat
    [InlineData("الحـــديث", "الحديث")]                 // tatweel
    [InlineData("أحمد إبراهيم آل", "احمد ابراهيم ال")]  // hamza and madda forms
    [InlineData("مكتبة", "مكتبه")]                      // ta marbuta
    [InlineData("مصطفى", "مصطفي")]                      // alef maqsura
    [InlineData("مؤسسة الرسالة", "موسسه الرساله")]
    [InlineData("الجزء ١٢", "الجزء 12")]                // Arabic-Indic digits
    [InlineData("Şiir Kitabı", "siir kitabi")]
    [InlineData("  Zad, al-Ma'ad!! ", "zad al ma ad")]  // punctuation collapsed
    public void Normalize_FoldsEveryVariantTheSameWay(string input, string expected)
    {
        SearchNormalizer.Normalize(input).Should().Be(expected);
    }

    [Fact]
    public void Tokenize_StripsArticle_AndDropsSingleLetters()
    {
        var tokens = SearchNormalizer.Tokenize(SearchNormalizer.Normalize("شرح الحديث و السنة"));

        tokens.Should().Equal("شرح", "حديث", "سنه");
    }

    [Fact]
    public void Tokenize_KeepsShortWordsStartingWithArticleLetters()
    {
        SearchNormalizer.Tokenize("الم").Should().Equal("الم");
    }

    [Fact]
    public void Tokenize_CapsWordCount()
    {
        SearchNormalizer.Tokenize("aa bb cc dd ee ff gg hh").Should().HaveCount(SearchNormalizer.MaxTokens);
    }
}