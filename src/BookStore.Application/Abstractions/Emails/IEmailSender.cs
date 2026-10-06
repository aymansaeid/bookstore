namespace BookStore.Application.Abstractions.Emails;

public sealed record EmailAttachment(string FileName, string ContentType, byte[] Content);

public sealed record EmailMessage(
    string ToEmail,
    string Subject,
    string HtmlBody,
    string TextBody,
    IReadOnlyList<EmailAttachment>? Attachments = null);


public interface IEmailSender
{
    /// Throws on failure. The outbox worker catches, records the error and
    /// retries with backoff, so implementations don't swallow exceptions.
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}