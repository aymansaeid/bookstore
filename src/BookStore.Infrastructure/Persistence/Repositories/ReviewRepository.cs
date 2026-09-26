using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Reviews;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class ReviewRepository(BookStoreDbContext dbContext) : IReviewRepository
{
    public Task<Review?> GetByIdAsync(int id, CancellationToken ct = default) =>
        dbContext.Reviews.FirstOrDefaultAsync(r => r.Id == id, ct);

    public Task<Review?> GetByCustomerAndBookAsync(int customerId, int bookId, CancellationToken ct = default) =>
        dbContext.Reviews.FirstOrDefaultAsync(r => r.CustomerId == customerId && r.BookId == bookId, ct);

    public void Add(Review review) => dbContext.Reviews.Add(review);

    public void Remove(Review review) => dbContext.Reviews.Remove(review);

    public async Task DeleteByCustomerAsync(int customerId, CancellationToken ct = default) =>
        await dbContext.Reviews.Where(r => r.CustomerId == customerId).ExecuteDeleteAsync(ct);
}