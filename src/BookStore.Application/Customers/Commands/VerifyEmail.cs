using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auth;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Loyalty;
using BookStore.Domain.Auth;
using BookStore.Domain.Orders;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace BookStore.Application.Customers.Commands;

public sealed record VerifyEmailCommand(string Token) : ICommand;

public sealed class VerifyEmailCommandValidator : AbstractValidator<VerifyEmailCommand>
{
    public VerifyEmailCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty().MaximumLength(200);
    }
}

public sealed class VerifyEmailCommandHandler(
    ICustomerRepository customerRepository,
    ISecurityTokenRepository tokenRepository,
    IOrderRepository orderRepository,
    ITokenHasher tokenHasher,
    IUnitOfWork unitOfWork,
    LoyaltyService loyalty,
    ILogger<VerifyEmailCommandHandler> logger)
    : ICommandHandler<VerifyEmailCommand>
{
    public async Task<Result> Handle(VerifyEmailCommand command, CancellationToken ct)
    {
        var hash = tokenHasher.Hash(command.Token);
        var token = await tokenRepository.GetUsableAsync(hash, SecurityTokenPurpose.EmailVerification, ct);

        if (token is null)
            return Result.Failure(CustomerErrors.InvalidToken);

        var customer = await customerRepository.GetByIdAsync(token.CustomerId, ct);
        if (customer is null || !customer.IsActive)
            return Result.Failure(CustomerErrors.InvalidToken);

        await using var transaction = await unitOfWork.BeginTransactionAsync(ct);

        token.MarkUsed();
        customer.VerifyEmail();

        // Decision #6 in action: past guest orders placed with this address
        // attach now, and only now, because the address is proven.
        var claimedOrders = await orderRepository.ListUnclaimedByEmailAsync(customer.Email, ct);
        foreach (var order in claimedOrders)
            order.AssignToCustomer(customer.Id);

        if (claimedOrders.Count > 0)
            logger.LogInformation(
                "Attached {Count} guest order(s) to customer {CustomerId} on verification.",
                claimedOrders.Count, customer.Id);

        await unitOfWork.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        // Guest orders just claimed by this account: delivered ones earn their
        // points now, exactly as if they'd been placed while signed in.
        foreach (var claimed in claimedOrders.Where(o => o.Status == OrderStatus.Delivered))
            await loyalty.AwardForOrderAsync(claimed, ct);

        return Result.Success();
    }
}