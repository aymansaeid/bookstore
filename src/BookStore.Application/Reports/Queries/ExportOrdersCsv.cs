using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Queries;
using BookStore.Application.Common;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Reports.Queries;

public sealed record ExportOrdersCsvQuery(DateOnly From, DateOnly To, CsvDelimiter Delimiter) : IQuery<CsvFileDto>;

public sealed class ExportOrdersCsvQueryValidator : AbstractValidator<ExportOrdersCsvQuery>
{
    public ExportOrdersCsvQueryValidator()
    {
        RuleFor(x => x.Delimiter).IsInEnum();
        RuleFor(x => x).Must(x => x.From <= x.To).WithMessage("'from' must be on or before 'to'.");
        RuleFor(x => x)
            .Must(x => x.To.DayNumber - x.From.DayNumber <= 366)
            .WithMessage("The range can be at most one year.");
    }
}

public sealed class ExportOrdersCsvQueryHandler(
    IReportingQueries reporting,
    IAuditLog auditLog,
    IUnitOfWork unitOfWork,
    IOptions<StoreOptions> storeOptions)
    : IQueryHandler<ExportOrdersCsvQuery, CsvFileDto>
{
    public async Task<Result<CsvFileDto>> Handle(ExportOrdersCsvQuery query, CancellationToken ct)
    {
        var clock = new StoreTimeZone(storeOptions.Value.TimeZoneId);
        var (fromUtc, toUtcExclusive) = clock.ToUtcRange(query.From, query.To);

        var rows = await reporting.ListOrdersForExportAsync(fromUtc, toUtcExclusive, ct);

        var csv = new CsvBuilder(query.Delimiter);
        csv.AddRow(
            "Order number", "Created (local)", "Paid (local)", "Status", "Customer email", "Recipient",
            "City", "Country", "Items", "Subtotal", "Discount", "Shipping", "Total", "Currency",
            "Coupon", "Carrier", "Tracking number", "Payment reference");

        foreach (var r in rows)
        {
            csv.AddRow(
                r.OrderNumber,
                clock.FormatLocal(r.CreatedAtUtc),
                r.PaidAtUtc is { } paid ? clock.FormatLocal(paid) : null,
                r.Status.ToString(),
                r.CustomerEmail,
                r.RecipientName,
                r.City,
                r.CountryCode,
                r.ItemCount,
                r.Subtotal,
                r.Discount,
                r.Shipping,
                r.Total,
                r.Currency,
                r.CouponCode,
                r.Carrier,
                r.TrackingNumber,
                r.PaymentReference);
        }

        // Customer data is leaving the system, so this is audited. It's a
        // query (the audit behavior only covers commands, which save), so
        // the entry is recorded and saved explicitly here.
        auditLog.Record("ExportOrdersCsv", "Order", null,
            new { query.From, query.To, Delimiter = query.Delimiter.ToString(), RowCount = rows.Count });
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(new CsvFileDto(
            csv.ToUtf8WithBom(),
            $"orders_{query.From:yyyy-MM-dd}_to_{query.To:yyyy-MM-dd}.csv"));
    }
}