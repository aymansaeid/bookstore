using BookStore.Application.Abstractions;
using BookStore.Application.Common.Localization;
using BookStore.Domain.Common;

namespace BookStore.Api.Common;

/// Resolved once per request. Outside a request (background jobs): Arabic.
public sealed class HttpLanguageContext(IHttpContextAccessor accessor) : ILanguageContext
{
    private Language? _resolved;

    public Language Current => _resolved ??= Resolve();

    private Language Resolve()
    {
        var request = accessor.HttpContext?.Request;
        return request is null
            ? Languages.Default
            : RequestLanguage.Resolve(request.Path.Value, request.Headers.AcceptLanguage.ToString());
    }
}