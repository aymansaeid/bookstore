using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Books;
using BookStore.Application.Common;
using BookStore.Application.Emails;
using FluentValidation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Inventory.Commands;

public sealed record SetLowStockThresholdCommand(int BookId, int Threshold)
    : ICommand<AdminBookDto>, IAuditableCommand
{
    public string AuditEntityType => "Book";
    public string? AuditEntityId => BookId.ToString();
}

public sealed class SetLowStockThresholdCommandValidator : AbstractValidator<SetLowStockThresholdCommand>
{
    public SetLowStockThresholdCommandValidator()
    {
        RuleFor(x => x.BookId).GreaterThan(0);
        RuleFor(x => x.Threshold).InclusiveBetween(0, 10_000);
    }
}

public sealed class SetLowStockThresholdCommandHandler(
    IBookRepository bookRepository, IUnitOfWork unitOfWork, IFileStorage fileStorage)
    : ICommandHandler<SetLowStockThresholdCommand, AdminBookDto>
{
    public async Task<Result<AdminBookDto>> Handle(SetLowStockThresholdCommand command, CancellationToken ct)
    {
        var book = await bookRepository.GetByIdAsync(command.BookId, ct);
        if (book is null)
            return Result.Failure<AdminBookDto>(InventoryErrors.BookNotFound(command.BookId));

        book.SetLowStockThreshold(command.Threshold);
        await unitOfWork.SaveChangesAsync(ct);

        // No alert logic here: the hourly scan picks up the new threshold
        // (or trigger it now via POST /low-stock/check).
        return Result.Success(book.ToAdminDto(fileStorage));
    }
}

/// Run by the hourly background scan, or on demand by an admin.
public sealed record CheckLowStockCommand : ICommand<int>;

public sealed class CheckLowStockCommandHandler(
    IBookRepository bookRepository,
    IStockNotificationRepository notificationRepository,
    IAdminUserRepository adminUserRepository,
    IEmailSender emailSender,
    IOptions<StoreOptions> storeOptions,
    ILogger<CheckLowStockCommandHandler> logger)
    : ICommandHandler<CheckLowStockCommand, int>
{
    public async Task<Result<int>> Handle(CheckLowStockCommand command, CancellationToken ct)
    {
        var books = await bookRepository.ListAsync(includeInactive: false, ct);

        // Recovered books: clear the flag so the NEXT drop alerts again.
        foreach (var recovered in books.Where(b => !b.IsLowStock && b.LowStockAlertedAtUtc is not null))
            await bookRepository.SetLowStockAlertedAsync(recovered.Id, null, ct);

        var newlyLow = books.Where(b => b.IsLowStock && b.LowStockAlertedAtUtc is null).ToList();
        if (newlyLow.Count == 0)
            return Result.Success(0);

        var recipients = await adminUserRepository.ListActiveEmailsAsync(ct);
        if (recipients.Count == 0)
        {
            // Not marked as alerted, so the alert fires once an admin exists.
            logger.LogWarning("{Count} book(s) are low on stock but there is no active admin to notify.", newlyLow.Count);
            return Result.Success(0);
        }

        var items = new List<LowStockAlertItem>();
        foreach (var book in newlyLow)
        {
            // The waiting-list count is the reprint signal: 3 copies left
            // with 40 people waiting is a very different decision from 3
            // copies left with nobody waiting.
            var waiting = await notificationRepository.CountAwaitingNotificationAsync(book.Id, ct);
            items.Add(new LowStockAlertItem(book.Title, book.AvailableToSell, book.LowStockThreshold, waiting));
        }

        foreach (var recipient in recipients)
            await emailSender.SendAsync(AdminEmailTemplates.LowStockDigest(recipient, items, storeOptions.Value), ct);

        // Marked AFTER sending: for an internal alert, a duplicate email is
        // better than a missed one (the opposite of back-in-stock).
        var now = DateTimeOffset.UtcNow;
        foreach (var book in newlyLow)
            await bookRepository.SetLowStockAlertedAsync(book.Id, now, ct);

        logger.LogInformation("Low-stock alert sent for {Count} book(s) to {Recipients} admin(s).",
            newlyLow.Count, recipients.Count);

        return Result.Success(newlyLow.Count);
    }
}