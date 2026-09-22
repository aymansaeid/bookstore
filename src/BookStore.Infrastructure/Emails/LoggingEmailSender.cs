using BookStore.Application.Abstractions.Emails;
using Microsoft.Extensions.Logging;

namespace BookStore.Infrastructure.Emails;

/// Development sender: logs the email instead of sending it, so you can see
/// the whole pipeline work without configuring SMTP.
public sealed class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        logger.LogInformation(
            "EMAIL (not sent)\n  To: {To}\n  Subject: {Subject}\n---\n{Text}\n---",
            message.ToEmail, message.Subject, message.TextBody);

        return Task.CompletedTask;
    }
}