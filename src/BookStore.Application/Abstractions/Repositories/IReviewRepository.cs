using BookStore.Domain.Reviews;

namespace BookStore.Application.Abstractions.Repositories;

public interface IReviewRepository
{
    Task<Review?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Review?> GetByCustomerAndBookAsync(int customerId, int bookId, CancellationToken ct = default);
    void Add(Review review);
    void Remove(Review review);
    Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default);
}