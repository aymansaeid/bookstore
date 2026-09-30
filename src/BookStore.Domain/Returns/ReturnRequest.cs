using BookStore.Domain.Common;
using BookStore.Domain.Orders;
using BookStore.Domain.Returns.Events;

namespace BookStore.Domain.Returns;

public sealed class ReturnRequest : AggregateRoot<int>
{
    public const int MaxCommentLength = 1000;

    public int OrderId { get; private set; }
    public string OrderNumber { get; private set; } = string.Empty;
    public string CustomerEmail { get; private set; } = string.Empty;

    public ReturnStatus Status { get; private set; }
    public ReturnReason Reason { get; private set; }
    public string? CustomerComment { get; private set; }

    private readonly List<ReturnLine> _lines = [];
    public IReadOnlyCollection<ReturnLine> Lines => _lines.AsReadOnly();

    /// Calculated at request time and shown to the customer upfront.
    public Money RefundAmount { get; private set; } = null!;
    public bool IsFullReturn { get; private set; }
    public string? RefundReference { get; private set; }

    public string? ReturnInstructions { get; private set; }

    /// Shown to the customer: a rejected return affects a legal right,
    /// so unlike review moderation notes, this is not internal.
    public string? RejectionReason { get; private set; }

    public int? HandledByAdminId { get; private set; }

    public DateTimeOffset RequestedAtUtc { get; private set; }
    public DateTimeOffset? ApprovedAtUtc { get; private set; }
    public DateTimeOffset? RejectedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public DateTimeOffset? CancelledAtUtc { get; private set; }

    public byte[] RowVersion { get; private set; } = [];

    public bool CanBeApproved => Status == ReturnStatus.Requested;
    public bool CanBeRejected => Status is ReturnStatus.Requested or ReturnStatus.Approved;
    public bool CanBeCompleted => Status == ReturnStatus.Approved;
    public bool CanBeCancelledByCustomer => Status is ReturnStatus.Requested or ReturnStatus.Approved;

    private ReturnRequest() { } // EF Core

    public static ReturnRequest Create(
        Order order, IReadOnlyCollection<ReturnItem> items, ReturnReason reason, string? comment)
    {
        if (order.Status is not (OrderStatus.Shipped or OrderStatus.Delivered))
            throw new InvalidOperationException($"Order {order.OrderNumber} is {order.Status} and can't be returned.");
        if (items.Count == 0)
            throw new ArgumentException("Choose at least one book to return.", nameof(items));
        if (items.Select(i => i.BookId).Distinct().Count() != items.Count)
            throw new ArgumentException("Each book may appear only once.", nameof(items));

        var trimmedComment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
        if (trimmedComment is { Length: > MaxCommentLength })
            throw new ArgumentException($"Comment can be at most {MaxCommentLength} characters.", nameof(comment));

        // Validates quantities against the order and throws on anything invalid.
        var (amount, isFull) = ReturnRefundCalculator.Calculate(order, items);

        var now = DateTimeOffset.UtcNow;
        var request = new ReturnRequest
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            CustomerEmail = order.CustomerEmail,
            Status = ReturnStatus.Requested,
            Reason = reason,
            CustomerComment = trimmedComment,
            RefundAmount = amount,
            IsFullReturn = isFull,
            RequestedAtUtc = now
        };

        foreach (var item in items)
        {
            var line = order.Lines.First(l => l.BookId == item.BookId);
            request._lines.Add(ReturnLine.Create(item.BookId, line.BookTitleSnapshot, item.Quantity));
        }

        // No Id yet at this point, so the event carries what the admin
        // notification email needs directly.
        request.Raise(new ReturnRequestedDomainEvent(
            order.OrderNumber, request.CustomerEmail, items.Sum(i => i.Quantity), reason, isFull, now));

        return request;
    }

    public void Approve(int? adminUserId, string instructions)
    {
        if (!CanBeApproved)
            throw new InvalidOperationException($"Can't approve a return that is {Status}.");
        if (string.IsNullOrWhiteSpace(instructions))
            throw new ArgumentException("Return instructions are required.", nameof(instructions));

        Status = ReturnStatus.Approved;
        ReturnInstructions = instructions.Trim();
        HandledByAdminId = adminUserId;
        ApprovedAtUtc = DateTimeOffset.UtcNow;

        Raise(new ReturnApprovedDomainEvent(Id, DateTimeOffset.UtcNow));
    }

    public void Reject(int? adminUserId, string reason)
    {
        if (!CanBeRejected)
            throw new InvalidOperationException($"Can't reject a return that is {Status}.");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("A rejection reason is required.", nameof(reason));

        Status = ReturnStatus.Rejected;
        RejectionReason = reason.Trim();
        HandledByAdminId = adminUserId;
        RejectedAtUtc = DateTimeOffset.UtcNow;

        Raise(new ReturnRejectedDomainEvent(Id, DateTimeOffset.UtcNow));
    }

    public void CancelByCustomer()
    {
        if (!CanBeCancelledByCustomer)
            throw new InvalidOperationException($"Can't cancel a return that is {Status}.");

        Status = ReturnStatus.CancelledByCustomer;
        CancelledAtUtc = DateTimeOffset.UtcNow;
    }

    /// The parcel arrived: record each book's condition and the refund the
    /// gateway already issued. Every line must be inspected; no guessing.
    public void Complete(
        int? adminUserId, IReadOnlyDictionary<int, ReturnItemCondition> conditions, string refundReference)
    {
        if (!CanBeCompleted)
            throw new InvalidOperationException($"Can't complete a return that is {Status}.");
        if (string.IsNullOrWhiteSpace(refundReference))
            throw new ArgumentException("Refund reference is required.", nameof(refundReference));

        var lineBookIds = _lines.Select(l => l.BookId).ToHashSet();
        if (!lineBookIds.SetEquals(conditions.Keys))
            throw new ArgumentException("Record a condition for every returned book, and only those.", nameof(conditions));

        foreach (var line in _lines)
            line.SetCondition(conditions[line.BookId]);

        Status = ReturnStatus.Completed;
        RefundReference = refundReference;
        HandledByAdminId = adminUserId;
        CompletedAtUtc = DateTimeOffset.UtcNow;

        Raise(new ReturnCompletedDomainEvent(Id, DateTimeOffset.UtcNow));
    }
}