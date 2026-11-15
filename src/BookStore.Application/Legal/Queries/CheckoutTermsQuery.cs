using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Common;
using BookStore.Application.Payments;
using BookStore.Domain.Common;
using BookStore.Domain.Legal;
using Microsoft.Extensions.Options;

namespace BookStore.Application.Legal.Queries;

/// Version: what checkout requires. Language: the language of the contract the
/// buyer will see (null before any is published). Available: false when
/// checkout in this language is refused (Turkish without Turkish texts).
public sealed record CheckoutTermsDto(string Version, string? Language, bool Available);

public sealed record GetCheckoutTermsQuery(Language Language) : IQuery<CheckoutTermsDto>;

public sealed class GetCheckoutTermsQueryHandler(LegalDocumentResolver resolver, IOptions<PaymentOptions> paymentOptions)
    : IQueryHandler<GetCheckoutTermsQuery, CheckoutTermsDto>
{
    public async Task<Result<CheckoutTermsDto>> Handle(GetCheckoutTermsQuery query, CancellationToken ct)
    {
        var fallback = paymentOptions.Value.CurrentTermsVersion;
        var contract = await resolver.ResolveAsync(LegalDocumentType.DistanceSalesContract, query.Language, ct);
        var preInformation = await resolver.ResolveAsync(LegalDocumentType.PreInformationForm, query.Language, ct);

        var required = CheckoutTerms.RequiredVersion(contract, preInformation, query.Language, fallback);

        return Result.Success(new CheckoutTermsDto(
            required.IsSuccess ? required.Value : fallback, contract?.Language, required.IsSuccess));
    }
}