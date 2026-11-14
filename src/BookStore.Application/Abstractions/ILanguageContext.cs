using BookStore.Domain.Common;

namespace BookStore.Application.Abstractions;

/// The language of the current request. Arabic outside a request (background
/// jobs), which never matters: emails take the language from the order or
/// customer, never from here.
public interface ILanguageContext
{
    Language Current { get; }
}