using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using BookStore.Api.Common;
using BookStore.Api.Extensions;
using BookStore.Api.OpenApi;
using BookStore.Application;
using BookStore.Application.Common;
using BookStore.Infrastructure;
using BookStore.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.Configure<StoreOptions>(builder.Configuration.GetSection(StoreOptions.SectionName));

builder.Services.AddJwtAuthentication();

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
});

var app = builder.Build();

await app.Services.SeedInitialAdminAsync();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "BookStore API v1");
        // Keeps you logged in across page refreshes while testing.
        options.EnablePersistAuthorization();
    });
}

app.UseExceptionHandler();
app.UseHttpsRedirection();
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();