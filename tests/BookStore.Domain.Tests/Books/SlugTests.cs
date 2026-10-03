using BookStore.Domain.Books;
using FluentAssertions;

namespace BookStore.Domain.Tests.Books;

public class SlugTests
{
    [Theory]
    [InlineData("My Great Book", "my-great-book")]
    [InlineData("  Spaces   Everywhere  ", "spaces-everywhere")]
    [InlineData("Book: The Sequel!", "book-the-sequel")]
    [InlineData("Şiir Kitabı", "siir-kitabi")]
    [InlineData("Öğrenci Rehberi", "ogrenci-rehberi")]
    [InlineData("Café Déjà Vu", "cafe-deja-vu")]
    [InlineData("already-a-slug", "already-a-slug")]
    [InlineData("Multiple---Dashes", "multiple-dashes")]
    public void Create_NormalizesCorrectly(string input, string expected)
    {
        Slug.Create(input).Value.Should().Be(expected);
    }

    [Theory]
    [InlineData("زاد المعاد", "زاد-المعاد")]
    [InlineData("زَادُ المَعَاد", "زاد-المعاد")]             // harakat removed
    [InlineData("الحـــديث", "الحديث")]                      // tatweel removed
    [InlineData("أحمد بن حنبل", "احمد-بن-حنبل")]            // hamza forms folded
    [InlineData("صحيح البخاري، الجزء ١", "صحيح-البخاري-الجزء-١")] // Arabic comma dropped, Arabic digit kept
    [InlineData("Zad al-Ma'ad 2", "zad-al-ma-ad-2")]
    public void Create_HandlesArabic(string input, string expected)
    {
        Slug.Create(input).Value.Should().Be(expected);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("!!!")]
    public void Create_Throws_WhenNothingUsableRemains(string input)
    {
        var act = () => Slug.Create(input);

        act.Should().Throw<ArgumentException>();
    }
}