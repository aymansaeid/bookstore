using BookStore.Api.Common;
using BookStore.Application;
using BookStore.Application.Common;
using BookStore.Infrastructure;
using Microsoft.AspNetCore.RateLimiting;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.Configure<StoreOptions>(builder.Configuration.GetSection(StoreOptions.SectionName));

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// The OpenAPI generator reads these options (not MVC's), so set it here
// too, or Swagger will document enums as numbers.
builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("order-lookup", httpContext =>
       RateLimitPartition.GetFixedWindowLimiter(
           partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
           factory: _ => new FixedWindowRateLimiterOptions
           {
               PermitLimit = 10,
               Window = TimeSpan.FromMinutes(1),
               QueueLimit = 0
           }));
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "BookStore API v1");
    });
}

app.UseExceptionHandler();
app.UseHttpsRedirection();
app.UseRateLimiter();

app.MapControllers();

app.Run();