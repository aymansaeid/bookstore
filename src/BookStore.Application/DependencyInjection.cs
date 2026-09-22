using BookStore.Application.Behaviors;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using BookStore.Application.Abstractions.Outbox;

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
        });

        services.AddValidatorsFromAssembly(assembly);

        // Scanned by interface so new handlers register themselves just by existing.
        services.Scan(selector => selector
            .FromAssemblies(assembly)
            .AddClasses(c => c.AssignableTo<IOutboxMessageHandler>())
            .AsImplementedInterfaces()
            .WithScopedLifetime());

        return services;
    }
}