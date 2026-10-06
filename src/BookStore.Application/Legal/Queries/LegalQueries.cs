using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Orders;
using BookStore.Application.Orders.Checkout;
using BookStore.Application.Returns;
using BookStore.Domain.Legal;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Legal.Queries;

public sealed record GetPublishedLegalDocumentQuery(LegalDocumentType Type, string? Language)
    : IQuery<PublishedLegalDocumentDto>;

public sealed class GetPublishedLegalDocumentQueryHandler(
    ILegalDocumentRepository repository,
    IOptions<StoreOptions> storeOptions,
    IOptions<ReturnOptions> returnOptions)
    : IQueryHandler<GetPublishedLegalDocumentQuery, PublishedLegalDocumentDto>
{
    public async Task<Result<PublishedLegalDocumentDto>> Handle(GetPublishedLegalDocumentQuery query, CancellationToken ct)
    {
        var language = LegalLanguages.Normalize(query.Language);
        var document = await repository.GetPublishedAsync(query.Type, language, ct);
        if (document is null)
            return Result.Failure<PublishedLegalDocumentDto>(LegalErrors.NotPublished(query.Type, language));

        // Generic render: seller details filled in, order fields show "—".
        var context = LegalContextFactory.Generic(language, storeOptions.Value, returnOptions.Value.WindowDays);

        return Result.Success(new PublishedLegalDocumentDto(
            document.Type, document.Language, document.Version, document.Title,
            LegalTemplateRenderer.RenderBody(document.BodyMarkdown, context), document.PublishedAtUtc!.Value));
    }
}

/// What the checkout checkbox must send back for a language: the published
/// contract's version, or the old config value until one is published.
public sealed record GetCurrentTermsVersionQuery(string? Language) : IQuery<string>;

public sealed class GetCurrentTermsVersionQueryHandler(
    ILegalDocumentRepository repository, IOptions<Payments.PaymentOptions> paymentOptions)
    : IQueryHandler<GetCurrentTermsVersionQuery, string>
{
    public async Task<Result<string>> Handle(GetCurrentTermsVersionQuery query, CancellationToken ct)
    {
        var contract = await repository.GetPublishedAsync(
            LegalDocumentType.DistanceSalesContract, LegalLanguages.Normalize(query.Language), ct);

        return Result.Success(contract?.Version ?? paymentOptions.Value.CurrentTermsVersion);
    }
}

public sealed record BuyerDetails(
    string Name, string? Email, string Phone, string? Line1, string? Line2,
    string? City, string? StateOrProvince, string? PostalCode, string? CountryCode);

/// Renders the pre-information form and contract with the CURRENT cart,
/// using the same quote calculation as the cart page and checkout.
public sealed record PreviewCheckoutLegalQuery(
    string? Language,
    QuoteCheckoutQuery Quote,
    BuyerDetails Buyer) : IQuery<CheckoutLegalPreviewDto>;

public sealed class PreviewCheckoutLegalQueryValidator : AbstractValidator<PreviewCheckoutLegalQuery>
{
    public PreviewCheckoutLegalQueryValidator()
    {
        RuleFor(x => x.Quote).NotNull();
        RuleFor(x => x.Buyer).NotNull();
        RuleFor(x => x.Buyer.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Buyer.Phone).NotEmpty().MaximumLength(30);
        RuleFor(x => x.Buyer.Email).EmailAddress().MaximumLength(320).When(x => !string.IsNullOrEmpty(x.Buyer.Email));
    }
}

public sealed class PreviewCheckoutLegalQueryHandler(
    ISender sender,
    ILegalDocumentRepository repository,
    IOptions<StoreOptions> storeOptions,
    IOptions<ReturnOptions> returnOptions)
    : IQueryHandler<PreviewCheckoutLegalQuery, CheckoutLegalPreviewDto>
{
    public async Task<Result<CheckoutLegalPreviewDto>> Handle(PreviewCheckoutLegalQuery query, CancellationToken ct)
    {
        var quoteResult = await sender.Send(query.Quote, ct);
        if (quoteResult.IsFailure)
            return Result.Failure<CheckoutLegalPreviewDto>(quoteResult.Error);

        var quote = quoteResult.Value;
        var store = storeOptions.Value;
        var language = LegalLanguages.Normalize(query.Language);
        var buyer = query.Buyer;

        var selected = quote.ShippingOptions.FirstOrDefault(o => o.Code == quote.SelectedShippingMethod);

        var context = new LegalRenderContext(
            store.Seller, language, quote.Currency, store.TimeZoneId, returnOptions.Value.WindowDays,
            OrderNumber: null,
            OrderDateUtc: DateTimeOffset.UtcNow,
            CustomerName: buyer.Name,
            CustomerEmail: buyer.Email,
            CustomerPhone: buyer.Phone,
            DeliveryAddress: LegalContextFactory.FormatAddress(
                buyer.Line1, buyer.Line2, buyer.City, buyer.StateOrProvince, buyer.PostalCode, buyer.CountryCode),
            ShippingMethod: selected?.Name ?? selected?.Carrier ?? selected?.Code,
            Lines: quote.Lines.Select(l => new LegalLine(l.Title, l.Quantity, l.UnitPrice, l.LineTotal)).ToList(),
            Subtotal: quote.Subtotal,
            Discount: quote.DiscountAmount,
            Shipping: quote.ShippingCost,
            GiftWrap: quote.GiftWrap.Selected ? quote.GiftWrap.Fee : 0,
            Total: quote.Total);

        async Task<RenderedLegalDocumentDto?> RenderAsync(LegalDocumentType type)
        {
            var document = await repository.GetPublishedAsync(type, language, ct);
            return document is null
                ? null
                : new RenderedLegalDocumentDto(type, document.Version, document.Title,
                    LegalTemplateRenderer.RenderBody(document.BodyMarkdown, context));
        }

        return Result.Success(new CheckoutLegalPreviewDto(
            await RenderAsync(LegalDocumentType.PreInformationForm),
            await RenderAsync(LegalDocumentType.DistanceSalesContract)));
    }
}

public sealed record GetOrderLegalRecordsQuery(string OrderNumber, string Email) : IQuery<IReadOnlyList<OrderLegalRecordDto>>;

public sealed class GetOrderLegalRecordsQueryHandler(
    IOrderRepository orderRepository, IOrderLegalRecordRepository recordRepository)
    : IQueryHandler<GetOrderLegalRecordsQuery, IReadOnlyList<OrderLegalRecordDto>>
{
    public async Task<Result<IReadOnlyList<OrderLegalRecordDto>>> Handle(GetOrderLegalRecordsQuery query, CancellationToken ct)
    {
        var order = await orderRepository.GetByOrderNumberAsync(query.OrderNumber.Trim().ToUpperInvariant(), ct);

        var emailMatches = order is not null
            && string.Equals(order.CustomerEmail, query.Email.Trim().ToLowerInvariant(), StringComparison.Ordinal);

        if (!emailMatches)
            return Result.Failure<IReadOnlyList<OrderLegalRecordDto>>(OrderErrors.TrackingNotFound);

        var records = await recordRepository.ListByOrderNumberAsync(order!.OrderNumber, ct);
        return Result.Success<IReadOnlyList<OrderLegalRecordDto>>(records.Select(r => r.ToDto()).ToList());
    }
}

public sealed record GetAdminOrderLegalRecordsQuery(int OrderId) : IQuery<IReadOnlyList<OrderLegalRecordDto>>;

public sealed class GetAdminOrderLegalRecordsQueryHandler(
    IOrderRepository orderRepository, IOrderLegalRecordRepository recordRepository)
    : IQueryHandler<GetAdminOrderLegalRecordsQuery, IReadOnlyList<OrderLegalRecordDto>>
{
    public async Task<Result<IReadOnlyList<OrderLegalRecordDto>>> Handle(GetAdminOrderLegalRecordsQuery query, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(query.OrderId, ct);
        if (order is null)
            return Result.Failure<IReadOnlyList<OrderLegalRecordDto>>(OrderErrors.NotFound(query.OrderId));

        var records = await recordRepository.ListByOrderNumberAsync(order.OrderNumber, ct);
        return Result.Success<IReadOnlyList<OrderLegalRecordDto>>(records.Select(r => r.ToDto()).ToList());
    }
}

public sealed record ListLegalDocumentsQuery(LegalDocumentType? Type, string? Language) : IQuery<IReadOnlyList<AdminLegalDocumentDto>>;

public sealed class ListLegalDocumentsQueryHandler(ILegalDocumentRepository repository)
    : IQueryHandler<ListLegalDocumentsQuery, IReadOnlyList<AdminLegalDocumentDto>>
{
    public async Task<Result<IReadOnlyList<AdminLegalDocumentDto>>> Handle(ListLegalDocumentsQuery query, CancellationToken ct) =>
        Result.Success<IReadOnlyList<AdminLegalDocumentDto>>(
            (await repository.ListAsync(query.Type, query.Language, ct)).Select(d => d.ToAdminDto()).ToList());
}

public sealed record GetLegalDocumentQuery(int DocumentId) : IQuery<AdminLegalDocumentDto>;

public sealed class GetLegalDocumentQueryHandler(ILegalDocumentRepository repository)
    : IQueryHandler<GetLegalDocumentQuery, AdminLegalDocumentDto>
{
    public async Task<Result<AdminLegalDocumentDto>> Handle(GetLegalDocumentQuery query, CancellationToken ct)
    {
        var document = await repository.GetByIdAsync(query.DocumentId, ct);
        return document is null
            ? Result.Failure<AdminLegalDocumentDto>(LegalErrors.NotFound(query.DocumentId))
            : Result.Success(document.ToAdminDto());
    }
}