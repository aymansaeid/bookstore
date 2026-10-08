using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Books;
using BookStore.Application.Catalog;
using BookStore.Application.Common;
using BookStore.Domain.Notifications;
using FluentValidation;

namespace BookStore.Application.Notifications;

public sealed record GetNotificationsQuery(int CustomerId, bool UnreadOnly, int Page = 1, int PageSize = 20)
    : IQuery<NotificationsPageDto>;

public sealed class GetNotificationsQueryValidator : AbstractValidator<GetNotificationsQuery>
{
    public GetNotificationsQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 50);
    }
}

public sealed class GetNotificationsQueryHandler(
    INotificationRepository repository, IBookRepository bookRepository, IFileStorage fileStorage)
    : IQueryHandler<GetNotificationsQuery, NotificationsPageDto>
{
    public async Task<Result<NotificationsPageDto>> Handle(GetNotificationsQuery query, CancellationToken ct)
    {
        var page = await repository.ListAsync(query.CustomerId, query.UnreadOnly, query.Page, query.PageSize, ct);
        var unread = await repository.CountUnreadAsync(query.CustomerId, ct);

        // Covers are looked up live (one query for the page): image URLs can
        // change after a regenerate, titles in notifications shouldn't.
        var bookIds = page.Items.Where(n => n.BookId is not null).Select(n => n.BookId!.Value).Distinct().ToList();
        var books = bookIds.Count == 0
            ? new Dictionary<int, Domain.Books.Book>()
            : (await bookRepository.ListByIdsAsync(bookIds, ct)).ToDictionary(b => b.Id);

        var items = page.Items.Select(n => new NotificationDto(
            n.Id, n.Type, n.CreatedAtUtc, n.IsRead,
            n.BookId, n.BookTitle, n.BookSlug,
            n.BookId is { } id && books.TryGetValue(id, out var book) ? BookMappings.CoverThumbnailUrl(book, fileStorage) : null,
            n.OrderNumber, n.MuhaqqiqId, n.MuhaqqiqName, n.MuhaqqiqSlug,
            n.OldPrice, n.NewPrice, n.Currency)).ToList();

        return Result.Success(new NotificationsPageDto(
            new PagedResult<NotificationDto>(items, page.Page, page.PageSize, page.TotalCount), unread));
    }
}

/// The header bell polls this: one tiny query.
public sealed record GetUnreadNotificationCountQuery(int CustomerId) : IQuery<int>;

public sealed class GetUnreadNotificationCountQueryHandler(INotificationRepository repository)
    : IQueryHandler<GetUnreadNotificationCountQuery, int>
{
    public async Task<Result<int>> Handle(GetUnreadNotificationCountQuery query, CancellationToken ct) =>
        Result.Success(await repository.CountUnreadAsync(query.CustomerId, ct));
}

public sealed record MarkNotificationReadCommand(int CustomerId, int NotificationId) : ICommand;

public sealed class MarkNotificationReadCommandHandler(INotificationRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<MarkNotificationReadCommand>
{
    public async Task<Result> Handle(MarkNotificationReadCommand command, CancellationToken ct)
    {
        // Scoped to the customer: someone else's id looks exactly like a missing one.
        var notification = await repository.GetAsync(command.NotificationId, command.CustomerId, ct);
        if (notification is null)
            return Result.Failure(NotificationErrors.NotFound(command.NotificationId));

        notification.MarkRead();
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed record MarkAllNotificationsReadCommand(int CustomerId) : ICommand;

public sealed class MarkAllNotificationsReadCommandHandler(INotificationRepository repository)
    : ICommandHandler<MarkAllNotificationsReadCommand>
{
    public async Task<Result> Handle(MarkAllNotificationsReadCommand command, CancellationToken ct)
    {
        await repository.MarkAllReadAsync(command.CustomerId, ct);
        return Result.Success();
    }
}

public sealed record GetFollowedMuhaqqiqsQuery(int CustomerId) : IQuery<IReadOnlyList<FollowedMuhaqqiqDto>>;

public sealed class GetFollowedMuhaqqiqsQueryHandler(
    IMuhaqqiqFollowRepository followRepository,
    IMuhaqqiqRepository muhaqqiqRepository,
    ICatalogQueries catalogQueries)
    : IQueryHandler<GetFollowedMuhaqqiqsQuery, IReadOnlyList<FollowedMuhaqqiqDto>>
{
    public async Task<Result<IReadOnlyList<FollowedMuhaqqiqDto>>> Handle(GetFollowedMuhaqqiqsQuery query, CancellationToken ct)
    {
        var follows = await followRepository.ListByCustomerAsync(query.CustomerId, ct);
        if (follows.Count == 0)
            return Result.Success<IReadOnlyList<FollowedMuhaqqiqDto>>([]);

        var muhaqqiqs = (await muhaqqiqRepository.ListByIdsAsync(follows.Select(f => f.MuhaqqiqId).ToList(), ct))
            .Where(m => m.IsActive)
            .ToDictionary(m => m.Id);
        var counts = await catalogQueries.CountBooksPerMuhaqqiqAsync(activeBooksOnly: true, ct);

        return Result.Success<IReadOnlyList<FollowedMuhaqqiqDto>>(follows
            .Where(f => muhaqqiqs.ContainsKey(f.MuhaqqiqId))
            .OrderByDescending(f => f.CreatedAtUtc)
            .Select(f => new FollowedMuhaqqiqDto(
                muhaqqiqs[f.MuhaqqiqId].ToPublicDto(counts.GetValueOrDefault(f.MuhaqqiqId)), f.CreatedAtUtc))
            .ToList());
    }
}

public sealed record FollowMuhaqqiqCommand(int CustomerId, int MuhaqqiqId) : ICommand;

public sealed class FollowMuhaqqiqCommandHandler(
    IMuhaqqiqFollowRepository followRepository, IMuhaqqiqRepository muhaqqiqRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<FollowMuhaqqiqCommand>
{
    private const int MaxFollows = 100;

    public async Task<Result> Handle(FollowMuhaqqiqCommand command, CancellationToken ct)
    {
        var muhaqqiq = await muhaqqiqRepository.GetByIdAsync(command.MuhaqqiqId, ct);
        if (muhaqqiq is null || !muhaqqiq.IsActive)
            return Result.Failure(NotificationErrors.MuhaqqiqNotFound(command.MuhaqqiqId));

        // Idempotent: a double-tapped follow button is never an error.
        if (await followRepository.GetAsync(command.CustomerId, command.MuhaqqiqId, ct) is not null)
            return Result.Success();

        if (await followRepository.CountByCustomerAsync(command.CustomerId, ct) >= MaxFollows)
            return Result.Failure(NotificationErrors.TooManyFollows(MaxFollows));

        followRepository.Add(MuhaqqiqFollow.Create(command.CustomerId, command.MuhaqqiqId));
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed record UnfollowMuhaqqiqCommand(int CustomerId, int MuhaqqiqId) : ICommand;

public sealed class UnfollowMuhaqqiqCommandHandler(IMuhaqqiqFollowRepository followRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<UnfollowMuhaqqiqCommand>
{
    public async Task<Result> Handle(UnfollowMuhaqqiqCommand command, CancellationToken ct)
    {
        var follow = await followRepository.GetAsync(command.CustomerId, command.MuhaqqiqId, ct);
        if (follow is null)
            return Result.Success(); // idempotent

        followRepository.Remove(follow);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}