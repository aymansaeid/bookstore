using BookStore.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Common;

public static class ResultExtensions
{
    public static IActionResult ToActionResult(this Result result) =>
        result.IsSuccess ? new NoContentResult() : Problem(result.Error);

    public static IActionResult ToActionResult<TValue>(this Result<TValue> result) =>
        result.IsSuccess ? new OkObjectResult(result.Value) : Problem(result.Error);

    private static IActionResult Problem(Error error)
    {
        var statusCode = error.Code.Contains("NotFound", StringComparison.OrdinalIgnoreCase)
            ? StatusCodes.Status404NotFound
            : StatusCodes.Status400BadRequest;

        return new ObjectResult(new ProblemDetails { Title = error.Code, Detail = error.Message, Status = statusCode })
        {
            StatusCode = statusCode
        };
    }
}