using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Payments;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Infrastructure.Payments;
using BookStore.Infrastructure.Persistence;
using BookStore.Infrastructure.Persistence.Interceptors;
using BookStore.Infrastructure.Persistence.Queries;
using BookStore.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BookStore.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        Stripe.StripeConfiguration.ApiKey = configuration["Stripe:SecretKey"];

        services.AddSingleton<DomainEventsToOutboxInterceptor>();

        services.AddDbContext<BookStoreDbContext>((sp, options) =>
        {
            options.UseSqlServer(configuration.GetConnectionString("BookStoreDb"));
            options.AddInterceptors(sp.GetRequiredService<DomainEventsToOutboxInterceptor>());
        });

        services.AddScoped<IBookRepository, BookRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<ICouponRepository, CouponRepository>();
        services.AddScoped<IShippingZoneRepository, ShippingZoneRepository>();
        services.AddScoped<IAdminUserRepository, AdminUserRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        services.AddScoped<IPaymentGateway, StripePaymentGateway>();

        services.AddScoped<IOrderQueries, OrderQueries>();


        return services;
    }
}