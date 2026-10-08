using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Notifications;

namespace BookStore.Application.Notifications;

/// Every producer writes through here, so the "never twice" rule lives in
/// exactly one place.
public sealed class NotificationWriter(INotificationRepository repository, IUnitOfWork unitOfWork)
{
    public async Task<int> AddNewAsync(IReadOnlyList<Notification> candidates, CancellationToken ct)
    {
        if (candidates.Count == 0)
            return 0;

        var fresh = new List<Notification>();

        // One check per key (normally one key per event), not one per customer.
        foreach (var group in candidates.GroupBy(n => n.DedupKey))
        {
            var customerIds = group.Select(n => n.CustomerId).Distinct().ToList();
            var alreadyNotified = await repository.CustomersWithKeyAsync(group.Key, customerIds, ct);

            fresh.AddRange(group
                .Where(n => !alreadyNotified.Contains(n.CustomerId))
                .DistinctBy(n => n.CustomerId));
        }

        if (fresh.Count == 0)
            return 0;

        repository.AddRange(fresh);

        // The unique (customer, key) index is the real guarantee; if two
        // workers ever race, the loser's batch fails and the outbox retries
        // it, at which point the check above filters everything out.
        await unitOfWork.SaveChangesAsync(ct);

        return fresh.Count;
    }
}