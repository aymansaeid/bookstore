using BookStore.Application.Common;
using BookStore.Domain.Orders;
using BookStore.Domain.Returns;

namespace BookStore.Application.Returns;

public static class ReturnErrors
{
    public static Error NotFound(int id) =>
        Error.NotFound("Return.NotFound", $"Return {id} was not found.");

    public static Error NoReturnForOrder =>
        Error.NotFound("Return.NoReturnForOrder", "There is no return request for this order.");

    public static Error OrderNotReturnable(OrderStatus status) =>
        Error.Conflict("Return.OrderNotReturnable",
            status == OrderStatus.Paid
                ? "This order hasn't shipped yet. To stop it, contact us and we'll cancel it instead."
                : $"Orders that are {status} can't be returned.");

    public static Error WindowClosed(DateTimeOffset deadline) =>
        Error.Conflict("Return.WindowClosed", $"The return window for this order closed on {deadline:yyyy-MM-dd}.");

    public static Error AlreadyRequested =>
        Error.Conflict("Return.AlreadyRequested", "A return has already been requested for this order.");

    public static Error InvalidItems(string message) =>
        Error.Validation("Return.InvalidItems", message);

    public static Error InvalidStatus(ReturnStatus current, string action) =>
        Error.Conflict("Return.InvalidStatus", $"Cannot {action} a return that is {current}.");

    public static Error IncompleteInspection =>
        Error.Validation("Return.IncompleteInspection",
            "Record a condition for every returned book, and only those.");
}