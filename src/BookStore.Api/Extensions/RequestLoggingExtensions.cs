using System.Diagnostics;
using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;
using Serilog;
using Serilog.Events;

namespace BookStore.Api.Extensions;

public static class RequestLoggingExtensions
{
    public const string RequestIdHeader = "X-Request-Id";

    /// The id that ties a customer's error report to one exact log entry.
    public static string CurrentRequestId(HttpContext context) =>
        Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier;

    public static IApplicationBuilder UseBookStoreRequestLogging(this IApplicationBuilder app)
    {
        // Every response carries its request id, so the frontend can show
        // "Error reference: 4bf92f35..." and support can find it in the logs.
        app.Use(async (context, next) =>
        {
            context.Response.OnStarting(() =>
            {
                context.Response.Headers[RequestIdHeader] = CurrentRequestId(context);
                return Task.CompletedTask;
            });

            await next();
        });

        // One summary line per request instead of ASP.NET Core's default
        // four or five. RequestPath excludes the query string on purpose:
        // query strings can carry tokens. Bodies and headers are never logged.
        return app.UseSerilogRequestLogging(options =>
        {
            options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0} ms";

            options.GetLevel = (context, elapsedMs, exception) =>
            {
                // Health probes hit every few seconds; logging them would
                // bury everything else.
                if (context.Request.Path.StartsWithSegments("/health"))
                    return LogEventLevel.Verbose;

                if (exception is not null || context.Response.StatusCode >= 500)
                    return LogEventLevel.Error;

                // Slow requests surface as warnings without any extra tooling.
                return elapsedMs > 2000 ? LogEventLevel.Warning : LogEventLevel.Information;
            };

            options.EnrichDiagnosticContext = (diagnostics, context) =>
            {
                diagnostics.Set("RequestId", CurrentRequestId(context));

                // Personal data under KVKK, kept for security investigations
                // only, hence the short log retention.
                diagnostics.Set("ClientIp", context.Connection.RemoteIpAddress?.ToString());

                var userId = context.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
                if (userId is not null)
                {
                    diagnostics.Set("UserId", userId);
                    diagnostics.Set("UserType", context.User.IsInRole("Admin") ? "admin" : "customer");
                }
            };
        });
    }
}