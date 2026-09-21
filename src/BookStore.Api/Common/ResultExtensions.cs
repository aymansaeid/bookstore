using BookStore.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace BookStore.Api.Common;

public static class ResultExtensions
{
    public static IActionResult ToActionResult(this Result result) =>
        result.IsSuccess ? new NoContentResult() : result.Error.ToProblem();

    public static IActionResult ToActionResult<TValue>(this Result<TValue> result) =>
        result.IsSuccess ? new OkObjectResult(result.Value) : result.Error.ToProblem();

    public static IActionResult ToProblem(this Error error)
    {
        var statusCode = error.Type switch
        {
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Validation => StatusCodes.Status400BadRequest,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status400BadRequest
        };

        return new ObjectResult(new ProblemDetails
        {
            Title = error.Code,
            Detail = error.Message,
            Status = statusCode
        })
        { StatusCode = statusCode };
    }
}