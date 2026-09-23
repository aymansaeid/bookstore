using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auth;
using BookStore.Application.Abstractions.Emails;
using BookStore.Application.Abstractions.Payments;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Infrastructure.Auth;
using BookStore.Infrastructure.Emails;
using BookStore.Infrastructure.Outbox;
using BookStore.Infrastructure.Payments;
using BookStore.Infrastructure.Persistence;
using BookStore.Infrastructure.Persistence.Interceptors;
using BookStore.Infrastructure.Persistence.Queries;
using BookStore.Infrastructure.Persistence.Repositories;
using BookStore.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Text;

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

        services.AddOptions<JwtOptions>()
    .Bind(configuration.GetSection(JwtOptions.SectionName))
    .Validate(o => !string.IsNullOrWhiteSpace(o.Issuer) && !string.IsNullOrWhiteSpace(o.Audience),
        "Jwt:Issuer and Jwt:Audience are required.")
    .Validate(o => Encoding.UTF8.GetByteCount(o.SigningKey ?? string.Empty) >= 32,
        "Jwt:SigningKey must be at least 32 bytes. Set it with dotnet user-secrets.")
    .Validate(o => o.ExpiryMinutes is > 0 and <= 1440,
        "Jwt:ExpiryMinutes must be between 1 and 1440.")
    // Fail at startup, not on the first login attempt at 2am.
    .ValidateOnStart();

        services.Configure<LocalFileStorageOptions>(configuration.GetSection(LocalFileStorageOptions.SectionName));
        services.AddSingleton<IFileStorage, LocalFileStorage>();

        services.AddSingleton<IPasswordHasher, IdentityPasswordHasher>();
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();

        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
        services.Configure<OutboxOptions>(configuration.GetSection(OutboxOptions.SectionName));

        var emailProvider = configuration.GetSection(EmailOptions.SectionName)
            .GetValue<EmailProvider>(nameof(EmailOptions.Provider));

        if (emailProvider == EmailProvider.Smtp)
            services.AddScoped<IEmailSender, SmtpEmailSender>();
        else
            services.AddScoped<IEmailSender, LoggingEmailSender>();

        services.AddHostedService<OutboxProcessor>();

        services.AddOptions<CustomerJwtOptions>()
    .Bind(configuration.GetSection(CustomerJwtOptions.SectionName))
    .Validate(o => !string.IsNullOrWhiteSpace(o.Issuer) && !string.IsNullOrWhiteSpace(o.Audience),
        "CustomerJwt:Issuer and CustomerJwt:Audience are required.")
    .Validate(o => Encoding.UTF8.GetByteCount(o.SigningKey ?? string.Empty) >= 32,
        "CustomerJwt:SigningKey must be at least 32 bytes.")
    .ValidateOnStart();

        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<ISecurityTokenRepository, SecurityTokenRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();

        services.AddSingleton<ITokenHasher, TokenHasher>();
        services.AddSingleton<ICustomerTokenGenerator, CustomerTokenGenerator>();

        return services;
    }
}