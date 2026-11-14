using BookStore.Domain.Books;
using BookStore.Domain.Common;

namespace BookStore.Application.Books;

public static class LocalizedTitles
{
    /// For anything that recorded a title at the time (order lines,
    /// notifications): Arabic keeps the recorded title; another language uses
    /// the live translation when there is one, else the recorded title.
    public static string FromSnapshot(string snapshot, Book? book, Language language) =>
        book is not null
        && language.IsTranslatable()
        && book.TranslationFor(language)?.Title is { Length: > 0 } translated
            ? translated
            : snapshot;
}