using BookStore.Domain.Books;
using BookStore.Domain.Catalog;
using BookStore.Domain.Common;
using FluentAssertions;

namespace BookStore.Domain.Tests.Catalog;

public class CatalogTests
{
    [Fact]
    public void Category_AcceptsSingleDecorativeLetter()
    {
        var category = Category.Create("الحديث", Slug.Create("الحديث"), "ح", null, null, 0);

        category.Letter.Should().Be("ح");
        category.IsTopLevel.Should().BeTrue();
    }

    [Fact]
    public void Category_RejectsMultiLetterDecoration()
    {
        var act = () => Category.Create("الحديث", Slug.Create("الحديث"), "حد", null, null, 0);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Muhaqqiq_CleansSpecialties()
    {
        var m = Muhaqqiq.Create("شعيب الأرناؤوط", Slug.Create("shuayb-al-arnaut"), null,
            ["الحديث", " الحديث ", "", "التراجم"], isFeatured: true, displayOrder: 0);

        m.Specialties.Should().Equal("الحديث", "التراجم");
    }

    [Fact]
    public void Muhaqqiq_RejectsTooManySpecialties()
    {
        var tooMany = Enumerable.Range(1, Muhaqqiq.MaxSpecialties + 1).Select(i => $"علم {i}");

        var act = () => Muhaqqiq.Create("اسم", Slug.Create("ism"), null, tooMany, false, 0);

        act.Should().Throw<ArgumentException>();
    }

    private static Book CreateBook() =>
        Book.Create("زاد المعاد", null, "ابن قيم الجوزية", Slug.Create("زاد المعاد"), "",
            "", BookFormat.Hardcover, 2400, "ar", null, null,
            BookDimensions.Create(5200, 240, 170, 210), Money.From(2400m, "TRY"), 10);

    [Fact]
    public void SetTaxonomy_KeepsCreditOrder()
    {
        var book = CreateBook();

        book.SetTaxonomy(3, [7, 2, 9]);

        book.CategoryId.Should().Be(3);
        book.OrderedMuhaqqiqIds.Should().Equal(7, 2, 9);
    }

    [Fact]
    public void SetTaxonomy_Reordering_ReusesExistingLinks()
    {
        var book = CreateBook();
        book.SetTaxonomy(3, [7, 2]);
        var original = book.Muhaqqiqs.First(m => m.MuhaqqiqId == 7);

        book.SetTaxonomy(3, [2, 7, 5]);

        book.OrderedMuhaqqiqIds.Should().Equal(2, 7, 5);
        book.Muhaqqiqs.First(m => m.MuhaqqiqId == 7).Should().BeSameAs(original);
    }

    [Fact]
    public void SetTaxonomy_RejectsDuplicates()
    {
        var act = () => CreateBook().SetTaxonomy(null, [4, 4]);
        act.Should().Throw<ArgumentException>();
    }
}