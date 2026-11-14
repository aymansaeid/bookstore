using BookStore.Application.Abstractions;
using BookStore.Application.Common.Localization;
using BookStore.Domain.Common;

namespace BookStore.Api.Common;

public sealed class HttpLanguageContext(IHttpContextAccessor accessor) : ILanguageContext
{
    private Language? _resolved;

    public Language Current =>
        _resolved ??= AcceptLanguage.Resolve(accessor.HttpContext?.Request.Headers.AcceptLanguage.ToString());
}