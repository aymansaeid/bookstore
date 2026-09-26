using BookStore.Domain.Auth;
using BookStore.Domain.Books;
using BookStore.Domain.Coupons;
using BookStore.Domain.Customers;
using BookStore.Domain.Notifications;
using BookStore.Domain.Orders;
using BookStore.Domain.Shipping;
using BookStore.Domain.Users;
using BookStore.Domain.Wishlists;
using BookStore.Infrastructure.Persistence.Outbox;
using BookStore.Infrastructure.Persistence.Webhooks;
using Microsoft.EntityFrameworkCore;
using BookStore.Domain.Reviews;
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
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<SecurityToken> SecurityTokens => Set<SecurityToken>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<StockNotification> StockNotifications => Set<StockNotification>();
    public DbSet<WishlistItem> WishlistItems => Set<WishlistItem>();
    public DbSet<Review> Reviews => Set<Review>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BookStoreDbContext).Assembly);
    }
}