using BookStore.Domain.Customers;

namespace BookStore.Application.Abstractions.Auth;

public interface ICustomerTokenGenerator
{
    AccessToken Generate(Customer customer);
}