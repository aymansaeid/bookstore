namespace BookStore.Domain.Customers;

public sealed class CustomerAddressLimitException(int max)
    : Exception($"A customer can save at most {max} addresses.");