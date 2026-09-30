using BookStore.Domain.Returns;

namespace BookStore.Application.Returns;

public sealed record ReturnLineDto(int BookId, string Title, int Quantity, ReturnItemCondition? ReceivedCondition);

public sealed record PublicReturnDto(
    string OrderNumber, ReturnStatus Status, ReturnReason Reason, IReadOnlyList<ReturnLineDto> Lines,
    decimal RefundAmount, string Currency, bool IsFullReturn,
    string? ReturnInstructions, string? RejectionReason,
    DateTimeOffset RequestedAtUtc, DateTimeOffset? CompletedAtUtc);

public sealed record AdminReturnDto(
    int Id, int OrderId, string OrderNumber, string CustomerEmail, ReturnStatus Status, ReturnReason Reason,
    string? CustomerComment, IReadOnlyList<ReturnLineDto> Lines,
    decimal RefundAmount, string Currency, bool IsFullReturn, string? RefundReference,
    string? ReturnInstructions, string? RejectionReason, int? HandledByAdminId,
    DateTimeOffset RequestedAtUtc, DateTimeOffset? ApprovedAtUtc, DateTimeOffset? RejectedAtUtc,
    DateTimeOffset? CompletedAtUtc, DateTimeOffset? CancelledAtUtc,
    IReadOnlyList<string> AllowedActions);

public sealed record AdminReturnSummaryDto(
    int Id, string OrderNumber, string CustomerEmail, ReturnStatus Status, int ItemCount,
    decimal RefundAmount, string Currency, bool IsFullReturn, DateTimeOffset RequestedAtUtc);

public sealed record ReturnableLineDto(int BookId, string Title, int PurchasedQuantity);

/// Reason codes: NotReturnable, WindowClosed, AlreadyRequested.
public sealed record ReturnEligibilityDto(
    bool CanRequest, string? Reason, DateTimeOffset? Deadline, IReadOnlyList<ReturnableLineDto> Lines);

public static class ReturnMappings
{
    private static List<ReturnLineDto> MapLines(ReturnRequest r) =>
        r.Lines.Select(l => new ReturnLineDto(l.BookId, l.BookTitleSnapshot, l.Quantity, l.ReceivedCondition)).ToList();

    public static PublicReturnDto ToPublicDto(this ReturnRequest r) =>
        new(r.OrderNumber, r.Status, r.Reason, MapLines(r), r.RefundAmount.Amount, r.RefundAmount.Currency,
            r.IsFullReturn, r.ReturnInstructions, r.RejectionReason, r.RequestedAtUtc, r.CompletedAtUtc);

    public static AdminReturnDto ToAdminDto(this ReturnRequest r)
    {
        var actions = new List<string>();
        if (r.CanBeApproved) actions.Add("Approve");
        if (r.CanBeCompleted) actions.Add("Complete");
        if (r.CanBeRejected) actions.Add("Reject");

        return new AdminReturnDto(
            r.Id, r.OrderId, r.OrderNumber, r.CustomerEmail, r.Status, r.Reason, r.CustomerComment, MapLines(r),
            r.RefundAmount.Amount, r.RefundAmount.Currency, r.IsFullReturn, r.RefundReference,
            r.ReturnInstructions, r.RejectionReason, r.HandledByAdminId,
            r.RequestedAtUtc, r.ApprovedAtUtc, r.RejectedAtUtc, r.CompletedAtUtc, r.CancelledAtUtc, actions);
    }
}