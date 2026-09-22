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
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("!!!")]
    public void Create_Throws_WhenNothingUsableRemains(string input)
    {
        var act = () => Slug.Create(input);

        act.Should().Throw<ArgumentException>();
    }
}