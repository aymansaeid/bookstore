using BookStore.Domain.Books;
using BookStore.Domain.Customers;
using BookStore.Domain.Library;
using FluentAssertions;

namespace BookStore.Domain.Tests.Library;

public class LibraryEntryTests
{
    [Fact]
    public void HundredPercent_MeansFinished()
    {
        var entry = LibraryEntry.Create(1, 1);

        entry.UpdateProgress(ReadingStatus.Reading, 100);

        entry.ReadingStatus.Should().Be(ReadingStatus.Finished);
        entry.FinishedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public void Rereading_ClearsFinishedDate_KeepsStartDate()
    {
        var entry = LibraryEntry.Create(1, 1);
        entry.UpdateProgress(ReadingStatus.Reading, 38);
        var started = entry.StartedAtUtc;
        entry.UpdateProgress(ReadingStatus.Finished, 100);

        entry.UpdateProgress(ReadingStatus.Reading, 10);

        entry.FinishedAtUtc.Should().BeNull();
        entry.StartedAtUtc.Should().Be(started);
    }

    [Fact]
    public void ClearingManualOwnership_WithoutProgress_MakesEntryEmpty()
    {
        var entry = LibraryEntry.Create(1, 1);
        entry.MarkOwnedManually();

        entry.ClearManualOwnership();

        entry.IsEmpty.Should().BeTrue();
    }

    [Fact]
    public void ReadingProfile_RejectsDuplicatesAndNegativeBudget()
    {
        var customer = Customer.Register("a@b.com", "hash", "أحمد", "كاظم", null, false);

        var duplicate = () => customer.SetReadingProfile(ReaderLevel.Beginner, 500m, [3, 3]);
        var negative = () => customer.SetReadingProfile(ReaderLevel.Beginner, -1m, [3]);

        duplicate.Should().Throw<ArgumentException>();
        negative.Should().Throw<ArgumentOutOfRangeException>();
    }
}