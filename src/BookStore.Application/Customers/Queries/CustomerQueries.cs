using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Abstractions.Storage;
using BookStore.Application.Common;
using BookStore.Application.Orders;
using BookStore.Domain.Books;

namespace BookStore.Application.Customers.Queries;

public sealed record GetCurrentCustomerQuery(int CustomerId) : IQuery<CustomerProfileDto>;

public sealed class GetCurrentCustomerQueryHandler(ICustomerRepository customerRepository)
    : IQueryHandler<GetCurrentCustomerQuery, CustomerProfileDto>
{
    public async Task<Result<CustomerProfileDto>> Handle(GetCurrentCustomerQuery query, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(query.CustomerId, ct);
        return customer is null || !customer.IsActive
            ? Result.Failure<CustomerProfileDto>(CustomerErrors.AccountUnavailable)
            : Result.Success(customer.ToProfileDto());
    }
}

public sealed record GetCustomerAddressesQuery(int CustomerId) : IQuery<IReadOnlyList<CustomerAddressDto>>;

public sealed class GetCustomerAddressesQueryHandler(ICustomerRepository customerRepository)
    : IQueryHandler<GetCustomerAddressesQuery, IReadOnlyList<CustomerAddressDto>>
{
    public async Task<Result<IReadOnlyList<CustomerAddressDto>>> Handle(
        GetCustomerAddressesQuery query, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(query.CustomerId, ct);
        if (customer is null || !customer.IsActive)
            return Result.Failure<IReadOnlyList<CustomerAddressDto>>(CustomerErrors.AccountUnavailable);

        return Result.Success<IReadOnlyList<CustomerAddressDto>>(
            customer.Addresses
                .OrderByDescending(a => a.IsDefault)
                .ThenBy(a => a.Label)
                .Select(a => a.ToDto())
                .ToList());
    }
}

public sealed record GetCustomerOrdersQuery(int CustomerId) : IQuery<IReadOnlyList<PublicOrderDto>>;

public sealed class GetCustomerOrdersQueryHandler(
    IOrderRepository orderRepository, IBookRepository bookRepository, IFileStorage fileStorage)
    : IQueryHandler<GetCustomerOrdersQuery, IReadOnlyList<PublicOrderDto>>
{
    public async Task<Result<IReadOnlyList<PublicOrderDto>>> Handle(GetCustomerOrdersQuery query, CancellationToken ct)
    {
        var orders = await orderRepository.ListByCustomerIdAsync(query.CustomerId, ct);

        // One query for every book across every order, not one per line.
        var bookIds = orders.SelectMany(o => o.Lines).Select(l => l.BookId).Distinct().ToList();
        var books = bookIds.Count == 0
            ? new Dictionary<int, Book>()
            : (await bookRepository.ListByIdsAsync(bookIds, ct)).ToDictionary(b => b.Id);

        return Result.Success<IReadOnlyList<PublicOrderDto>>(
            orders.Select(o => o.ToPublicDto(books, fileStorage)).ToList());
    }
}