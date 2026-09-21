using BookStore.Domain.Books;
using BookStore.Domain.Coupons;
using BookStore.Domain.Orders;
using BookStore.Domain.Shipping;
using BookStore.Domain.Users;
using BookStore.Infrastructure.Persistence.Outbox;
using BookStore.Infrastructure.Persistence.Webhooks;
using Microsoft.EntityFrameworkCore;

namespace BookStore.Infrastructure.Persistence;

public sealed class BookStoreDbContext(DbContextOptions<BookStoreDbContext> options) : DbContext(options)
{
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<ShippingZone> ShippingZones => Set<ShippingZone>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<ProcessedWebhook> ProcessedWebhooks => Set<ProcessedWebhook>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BookStoreDbContext).Assembly);
    }
}