using BookStore.Application.Abstractions.Outbox;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Loyalty;
using BookStore.Domain.Orders.Events;
using BookStore.Domain.Returns.Events;

namespace BookStore.Application.Outbox.Handlers;

public sealed class OrderDeliveredLoyaltyHandler(IOrderRepository orderRepository, LoyaltyService loyalty)
    : IOutboxMessageHandler
{
    public string MessageType => nameof(OrderDeliveredDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<OrderDeliveredDomainEvent>(payloadJson);

        var order = await orderRepository.GetByIdAsync(e.OrderId, ct);
        if (order is not null)
            await loyalty.AwardForOrderAsync(order, ct);
    }
}

public sealed class ReturnCompletedLoyaltyHandler(
    IReturnRequestRepository returnRepository, IOrderRepository orderRepository, LoyaltyService loyalty)
    : IOutboxMessageHandler
{
    public string MessageType => nameof(ReturnCompletedDomainEvent);

    public async Task HandleAsync(string payloadJson, CancellationToken ct)
    {
        var e = OutboxSerialization.Deserialize<ReturnCompletedDomainEvent>(payloadJson);

        var request = await returnRepository.GetByIdAsync(e.ReturnRequestId, ct);
        if (request is null)
            return;

        var order = await orderRepository.GetByIdAsync(request.OrderId, ct);
        if (order is not null)
            await loyalty.ClawbackForReturnAsync(request, order, ct);
    }
}