using BookStore.Application.Catalog;
using BookStore.Application.Common;
using BookStore.Domain.Notifications;

namespace BookStore.Application.Notifications;

public sealed record NotificationDto(
    int Id,
    NotificationType Type,
    DateTimeOffset CreatedAtUtc,
    bool IsRead,
    int? BookId,
    string? BookTitle,
    string? BookSlug,
    string? CoverThumbnailUrl,
    string? OrderNumber,
    int? MuhaqqiqId,
    string? MuhaqqiqName,
    string? MuhaqqiqSlug,
    decimal? OldPrice,
    decimal? NewPrice,
    string? Currency);

public sealed record NotificationsPageDto(PagedResult<NotificationDto> Notifications, int UnreadCount);

public sealed record FollowedMuhaqqiqDto(PublicMuhaqqiqDto Muhaqqiq, DateTimeOffset FollowedAtUtc);

public static class NotificationErrors
{
    public static Error NotFound(int id) =>
        Error.NotFound("Notification.NotFound", $"Notification {id} was not found.");

    public static Error MuhaqqiqNotFound(int id) =>
        Error.NotFound("Follow.MuhaqqiqNotFound", $"Muhaqqiq {id} was not found.");

    public static Error TooManyFollows(int max) =>
        Error.Conflict("Follow.TooMany", $"You can follow at most {max} muhaqqiqs.");
}