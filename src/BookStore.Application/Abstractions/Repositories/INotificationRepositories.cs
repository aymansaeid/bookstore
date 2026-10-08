using BookStore.Application.Common;
using BookStore.Domain.Notifications;

namespace BookStore.Application.Abstractions.Repositories;

public interface INotificationRepository
{
    /// Which of these customers already have a notification with this key.
    Task<IReadOnlySet<int>> CustomersWithKeyAsync(string dedupKey, IReadOnlyCollection<int> customerIds, CancellationToken ct = default);

    void AddRange(IEnumerable<Notification> notifications);

    Task<PagedResult<Notification>> ListAsync(int customerId, bool unreadOnly, int page, int pageSize, CancellationToken ct = default);
    Task<int> CountUnreadAsync(int customerId, CancellationToken ct = default);
    Task<Notification?> GetAsync(int notificationId, int customerId, CancellationToken ct = default);
    Task MarkAllReadAsync(int customerId, CancellationToken ct = default);
    Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default);
}

public interface IMuhaqqiqFollowRepository
{
    Task<MuhaqqiqFollow?> GetAsync(int customerId, int muhaqqiqId, CancellationToken ct = default);
    Task<IReadOnlyList<MuhaqqiqFollow>> ListByCustomerAsync(int customerId, CancellationToken ct = default);
    Task<IReadOnlyList<int>> ListFollowerIdsAsync(int muhaqqiqId, CancellationToken ct = default);
    Task<int> CountByCustomerAsync(int customerId, CancellationToken ct = default);
    void Add(MuhaqqiqFollow follow);
    void Remove(MuhaqqiqFollow follow);
    Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default);
}