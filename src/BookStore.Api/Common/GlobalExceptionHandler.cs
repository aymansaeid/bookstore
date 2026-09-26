using BookStore.Application.Common;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Common;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        switch (exception)
        {
            case ValidationException validationException:
                {
                    var errors = validationException.Errors
                        .GroupBy(e => e.PropertyName)
                        .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

                    httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
                    await httpContext.Response.WriteAsJsonAsync(new ValidationProblemDetails(errors)
                    {
                        Status = StatusCodes.Status400BadRequest,
                        Title = "One or more validation errors occurred."
                    }, ct);
                    return true;
                }

            case ConcurrencyConflictException conflict:
                {
                    httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
                    await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
                    {
                        Status = StatusCodes.Status409Conflict,
                        Title = "Concurrency conflict",
                        Detail = conflict.Message
                    }, ct);
                    return true;
                }

            case DuplicateEntryException duplicate:
                {
                    httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
                    await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
                    {
                        Status = StatusCodes.Status409Conflict,
                        Title = "Duplicate",
                        Detail = duplicate.Message
                    }, ct);
                    return true;
                }

            default:
                {
                    logger.LogError(exception, "Unhandled exception on {Path}", httpContext.Request.Path);

                    httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
                    {
                        Status = StatusCodes.Status500InternalServerError,
                        Title = "An unexpected error occurred."
                    }, ct);
                    return true;
                }
        }
    }
}