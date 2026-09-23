using BookStore.Application.Common;

namespace BookStore.Application.Notifications;

public static class StockNotificationErrors
{
    public static Error BookNotFound =>
        Error.NotFound("StockNotification.BookNotFound", "That book was not found.");

    public static Error AlreadyInStock =>
        Error.Validation("StockNotification.AlreadyInStock",
            "This book is currently available — you can order it now.");

    public static Error InvalidToken =>
        Error.Validation("StockNotification.InvalidToken", "This link is invalid or has expired.");
}