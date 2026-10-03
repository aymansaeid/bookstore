namespace BookStore.Api.Extensions;

public static class CorsExtensions
{
    public const string PolicyName = "Storefront";

    public static IServiceCollection AddStorefrontCors(this IServiceCollection services, IConfiguration configuration)
    {
        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

        services.AddCors(options => options.AddPolicy(PolicyName, policy =>
        {
            policy.WithOrigins(origins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
        .WithExposedHeaders(RequestLoggingExtensions.RequestIdHeader);
        }));

        return services;
    }
}