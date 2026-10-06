using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using BookStore.Api.Common;
using BookStore.Api.Extensions;
using BookStore.Api.OpenApi;
using BookStore.Application;
using BookStore.Application.Abstractions;
using BookStore.Application.Common;
using BookStore.Application.Payments;
using BookStore.Application.Returns;
using BookStore.Application.Reviews;
using BookStore.Infrastructure;
using BookStore.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Serilog;

// Bootstrap logger: captures failures that happen before configuration is
// even loaded (bad appsettings, failed options validation).
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Services.AddSerilog((services, logger) => logger
        .ReadFrom.Configuration(builder.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext());

    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);

    builder.Services.AddOptions<StoreOptions>()
        .Bind(builder.Configuration.GetSection(StoreOptions.SectionName))
        .Validate(o => TimeZoneInfo.TryFindSystemTimeZoneById(o.TimeZoneId, out _),
            "Store:TimeZoneId is not a recognized time zone.")
        .Validate(o => !o.Pickup.Enabled
               || (!string.IsNullOrWhiteSpace(o.Pickup.AddressLine1) && !string.IsNullOrWhiteSpace(o.Pickup.PostalCode)),
    "Store:Pickup is enabled but has no address.")
        .ValidateOnStart();

    builder.Services.Configure<ReviewOptions>(builder.Configuration.GetSection(ReviewOptions.SectionName));
    builder.Services.Configure<ReturnOptions>(builder.Configuration.GetSection(ReturnOptions.SectionName));

    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<ICurrentActor, HttpCurrentActor>();

    builder.Services.AddJwtAuthentication();
    builder.Services.AddStorefrontCors(builder.Configuration);

    builder.Services.AddControllers()
        .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
    builder.Services.ConfigureHttpJsonOptions(o =>
        o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

    builder.Services.AddOpenApi(o => o.AddDocumentTransformer<BearerSecuritySchemeTransformer>());
    builder.Services.AddProblemDetails();
    builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        static RateLimitPartition<string> PerIp(HttpContext ctx, int permitLimit) =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = permitLimit,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                });

        options.AddPolicy("coupon-check", ctx => PerIp(ctx, 10));
        options.AddPolicy("order-lookup", ctx => PerIp(ctx, 10));
        options.AddPolicy("login", ctx => PerIp(ctx, 5));
        options.AddPolicy("customer-auth", ctx => PerIp(ctx, 5));
        options.AddPolicy("review-submit", ctx => PerIp(ctx, 5));
        options.AddPolicy("checkout", ctx => PerIp(ctx, 10));
        options.AddPolicy("quote", ctx => PerIp(ctx, 30));
    });

    var app = builder.Build();

    await app.Services.SeedInitialAdminAsync();

    // Outermost: sees the FINAL status of every request, including 500s the
    // exception handler produced, and logs each request exactly once.
    app.UseBookStoreRequestLogging();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/openapi/v1.json", "BookStore API v1");
            options.EnablePersistAuthorization();
        });
    }

    app.UseExceptionHandler();
    app.UseHttpsRedirection();
    app.UseStaticFiles(new StaticFileOptions
    {
        OnPrepareResponse = context =>
        {
            // Upload file names are random and never reused: a changed image
            // always gets a new URL. So browsers can keep them for a year.
            if (context.Context.Request.Path.StartsWithSegments("/uploads"))
                context.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        }
    });
    app.UseCors(CorsExtensions.PolicyName);
    app.UseRateLimiter();

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapBookStoreHealthChecks();

    var paymentOptions = app.Services.GetRequiredService<IOptions<PaymentOptions>>().Value;
    if (paymentOptions.Provider == PaymentProvider.Mock)
    {
        if (!app.Environment.IsDevelopment())
            throw new InvalidOperationException(
                "Payments:Provider is 'Mock' outside Development. Refusing to start.");

        app.MapDevPaymentEndpoints();
    }

    await app.RunAsync();
}
// HostAbortedException is how `dotnet ef` stops the app after reading the
// model. It's intentional, not a crash, and must not be logged as fatal.
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "BookStore API failed to start.");
}
finally
{
    await Log.CloseAndFlushAsync();
}