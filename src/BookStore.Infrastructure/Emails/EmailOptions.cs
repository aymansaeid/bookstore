namespace BookStore.Infrastructure.Emails;

public enum EmailProvider
{
    /// Writes emails to the log instead of sending. Default for local dev.
    Logging = 0,
    Smtp = 1
}

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    public EmailProvider Provider { get; init; } = EmailProvider.Logging;

    public string FromName { get; init; } = "BookStore";
    public string FromEmail { get; init; } = "noreply@example.com";

    public string SmtpHost { get; init; } = string.Empty;
    public int SmtpPort { get; init; } = 587;
    public string SmtpUsername { get; init; } = string.Empty;
    public string SmtpPassword { get; init; } = string.Empty;
    public bool UseStartTls { get; init; } = true;
}