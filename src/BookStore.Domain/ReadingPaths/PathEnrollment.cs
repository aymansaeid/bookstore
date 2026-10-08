using BookStore.Domain.Common;

namespace BookStore.Domain.ReadingPaths;

/// "I started this path". Progress is NOT stored here: it's calculated from
/// the library, so finishing a book advances every path that contains it.
public sealed class PathEnrollment : AggregateRoot<int>
{
    public int CustomerId { get; private set; }
    public int ReadingPathId { get; private set; }
    public DateTimeOffset StartedAtUtc { get; private set; }

    private PathEnrollment() { } // EF Core

    public static PathEnrollment Create(int customerId, int readingPathId) =>
        new() { CustomerId = customerId, ReadingPathId = readingPathId, StartedAtUtc = DateTimeOffset.UtcNow };
}