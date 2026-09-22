using BookStore.Application.Abstractions.Emails;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace BookStore.Infrastructure.Emails;

public sealed class SmtpEmailSender(IOptions<EmailOptions> options) : IEmailSender
{
    private readonly EmailOptions _options = options.Value;

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(_options.FromName, _options.FromEmail));
        mime.To.Add(MailboxAddress.Parse(message.ToEmail));
        mime.Subject = message.Subject;

        // Both parts: clients that block HTML fall back to plain text, and
        // spam filters treat text-less HTML mail with suspicion.
        mime.Body = new BodyBuilder
        {
            HtmlBody = message.HtmlBody,
            TextBody = message.TextBody
        }.ToMessageBody();

        // A fresh connection per email. Fine at this volume; if you ever send
        // in bulk, pool the client instead.
        using var client = new SmtpClient();

        await client.ConnectAsync(
            _options.SmtpHost,
            _options.SmtpPort,
            _options.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.SslOnConnect,
            ct);

        if (!string.IsNullOrWhiteSpace(_options.SmtpUsername))
            await client.AuthenticateAsync(_options.SmtpUsername, _options.SmtpPassword, ct);

        await client.SendAsync(mime, ct);
        await client.DisconnectAsync(quit: true, ct);
    }
}