using BookStore.Application.Abstractions.Repositories;
using BookStore.Domain.Customers;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence.Repositories;

public sealed class CustomerRepository(BookStoreDbContext dbContext) : ICustomerRepository
{
    public Task<Customer?> GetByIdAsync(int id, CancellationToken ct = default) =>
        dbContext.Customers.Include(c => c.Addresses).FirstOrDefaultAsync(c => c.Id == id, ct);

    public Task<Customer?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return dbContext.Customers.Include(c => c.Addresses).FirstOrDefaultAsync(c => c.Email == normalized, ct);
    }

    public Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return dbContext.Customers.AnyAsync(c => c.Email == normalized, ct);
    }

    public void Add(Customer customer) => dbContext.Customers.Add(customer);
}