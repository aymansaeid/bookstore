using BookStore.Application.Abstractions.Outbox;
using BookStore.Application.Behaviors;
using BookStore.Application.Books.Queries;
using BookStore.Application.Catalog;
using BookStore.Application.Library;
using BookStore.Application.Notifications;
using BookStore.Application.Orders;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace BookStore.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);
            cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
            cfg.AddOpenBehavior(typeof(AuditBehavior<,>));
        });

        services.AddValidatorsFromAssembly(assembly);

        // Scanned by interface so new handlers register themselves just by existing.
        services.Scan(selector => selector
            .FromAssemblies(assembly)
            .AddClasses(c => c.AssignableTo<IOutboxMessageHandler>())
            .AsImplementedInterfaces()
            .WithScopedLifetime());

        services.AddScoped<TaxonomyLookupLoader>();
        services.AddScoped<OrderCancellation>();
        services.AddScoped<LibraryReader>();
        services.AddScoped<BookPageAssembler>();

        services.AddScoped<NotificationWriter>();

        return services;
    }
}