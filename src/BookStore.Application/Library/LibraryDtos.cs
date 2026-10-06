using BookStore.Application.Books;
using BookStore.Domain.Library;

namespace BookStore.Application.Library;

public sealed record LibraryItemDto(
    BookSummaryDto Book,
    LibraryOwnership Ownership,
    ReadingStatus ReadingStatus,
    int ProgressPercent,
    DateTimeOffset? AcquiredAtUtc,
    DateTimeOffset? LastReadAtUtc);

public sealed record LibraryStatsDto(
    int TotalBooks, int Reading, int Finished, int NotStarted,
    int TotalPages, int PagesRead, int FinishedThisYear);

public sealed record LibraryDto(
    IReadOnlyList<LibraryItemDto> Items,
    LibraryStatsDto Stats,
    int? CurrentlyReadingBookId);

public static class LibraryErrors
{
    public static Common.Error NotInLibrary(int bookId) =>
        Common.Error.Conflict("Library.NotInLibrary",
            $"Book {bookId} isn't in your library. Buy it, or add it as one you already own.");

    public static Common.Error BookNotFound(int bookId) =>
        Common.Error.NotFound("Library.BookNotFound", $"Book {bookId} was not found.");
}