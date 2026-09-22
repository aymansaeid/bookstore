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
                  // Needed in step 2 for refresh-token cookies. Browsers
                  // reject credentials with a wildcard origin, which is why
                  // there's an explicit allow-list here and no AllowAnyOrigin.
                  .AllowCredentials();
        }));

        return services;
    }
}