using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auth;
using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Emails;
using BookStore.Domain.Notifications;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Notifications.Commands;

public sealed record SubscribeToStockNotificationCommand(int BookId, string Email) : ICommand;

public sealed class SubscribeToStockNotificationCommandValidator
    : AbstractValidator<SubscribeToStockNotificationCommand>
{
    public SubscribeToStockNotificationCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
    }
}

public sealed class SubscribeToStockNotificationCommandHandler(
    IBookRepository bookRepository,
    IStockNotificationRepository notificationRepository,
    ITokenHasher tokenHasher,
    IEmailSender emailSender,
    IUnitOfWork unitOfWork,
    IOptions<StoreOptions> storeOptions)
    : ICommandHandler<SubscribeToStockNotificationCommand>
{
    public async Task<Result> Handle(SubscribeToStockNotificationCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null || !book.IsActive)
            return Result.Failure(StockNotificationErrors.BookNotFound);

        if (book.AvailableToSell > 0)
            return Result.Failure(StockNotificationErrors.AlreadyInStock);

        var email = command.Email.Trim().ToLowerInvariant();
        var generated = tokenHasher.Generate();

        var existing = await notificationRepository.GetByBookAndEmailAsync(book.Id, email, ct);

        if (existing is not null)
        {
            if (existing.IsAwaitingNotification)
                return Result.Success(); // Already subscribed and confirmed; silently succeed.

            // Either unconfirmed (they lost the email) or previously
            // notified (the book sold out again) — reset and re-send.
            existing.Resubscribe(generated.TokenHash);
        }
        else
        {
            notificationRepository.Add(StockNotification.Create(book.Id, email, generated.TokenHash));
        }

        await unitOfWork.SaveChangesAsync(ct);

        // Double opt-in (decision #2): nobody joins a list without proving
        // they own the address.
        await emailSender.SendAsync(
            StockNotificationEmailTemplates.ConfirmSubscription(
                email, book.Title, generated.PlainToken, storeOptions.Value), ct);

        return Result.Success();
    }
}

public sealed record ConfirmStockNotificationCommand(string Token) : ICommand<ConfirmedSubscriptionDto>;

public sealed record ConfirmedSubscriptionDto(int BookId, string BookTitle);

public sealed class ConfirmStockNotificationCommandValidator : AbstractValidator<ConfirmStockNotificationCommand>
{
    public ConfirmStockNotificationCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty().MaximumLength(200);
    }
}

public sealed class ConfirmStockNotificationCommandHandler(
    IStockNotificationRepository notificationRepository,
    IBookRepository bookRepository,
    ITokenHasher tokenHasher,
    IUnitOfWork unitOfWork)
    : ICommandHandler<ConfirmStockNotificationCommand, ConfirmedSubscriptionDto>
{
    public async Task<Result<ConfirmedSubscriptionDto>> Handle(
        ConfirmStockNotificationCommand command, CancellationToken ct)
    {
        var notification = await notificationRepository.GetByTokenHashAsync(tokenHasher.Hash(command.Token), ct);
        if (notification is null)
            return Result.Failure<ConfirmedSubscriptionDto>(StockNotificationErrors.InvalidToken);

        var book = await bookRepository.GetByIdAsync(notification.BookId, ct);
        if (book is null)
            return Result.Failure<ConfirmedSubscriptionDto>(StockNotificationErrors.BookNotFound);

        notification.Confirm();
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(new ConfirmedSubscriptionDto(book.Id, book.Title));
    }
}

public sealed record UnsubscribeFromStockNotificationCommand(string Token) : ICommand;

public sealed class UnsubscribeFromStockNotificationCommandHandler(
    IStockNotificationRepository notificationRepository,
    ITokenHasher tokenHasher,
    IUnitOfWork unitOfWork)
    : ICommandHandler<UnsubscribeFromStockNotificationCommand>
{
    public async Task<Result> Handle(UnsubscribeFromStockNotificationCommand command, CancellationToken ct)
    {
        var notification = await notificationRepository.GetByTokenHashAsync(tokenHasher.Hash(command.Token), ct);

        // Always succeeds, even on a bad token: an unsubscribe link that
        // reports errors is worse than one that quietly does nothing.
        if (notification is not null)
        {
            notification.MarkNotified(); // Takes it out of the awaiting list.
            await unitOfWork.SaveChangesAsync(ct);
        }

        return Result.Success();
    }
}