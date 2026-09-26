using BookStore.Application.Abstractions.Repositories;

namespace BookStore.Application.Reviews;

/// Shared by the eligibility query (drives the frontend button) and the
/// submit command (enforces it), so the two can never disagree.
internal static class ReviewRules
{
    public static async Task<ReviewEligibilityDto> CheckAsync(
        IReviewRepository reviewRepository,
        IOrderRepository orderRepository,
        ReviewOptions options,
        int customerId,
        int bookId,
        CancellationToken ct)
    {
        var existing = await reviewRepository.GetByCustomerAndBookAsync(customerId, bookId, ct);
        if (existing is not null)
            return new ReviewEligibilityDto(false, existing.Id, "AlreadyReviewed");

        var cutoff = DateTimeOffset.UtcNow.AddDays(-options.ShippedOrderEligibleAfterDays);
        var hasPurchase = await orderRepository.HasReviewablePurchaseAsync(customerId, bookId, cutoff, ct);

        return hasPurchase
            ? new ReviewEligibilityDto(true, null, null)
            : new ReviewEligibilityDto(false, null, "NoEligiblePurchase");
    }
}