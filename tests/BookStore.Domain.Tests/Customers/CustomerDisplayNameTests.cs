using BookStore.Domain.Customers;
using FluentAssertions;

namespace BookStore.Domain.Tests.Customers;

public class CustomerDisplayNameTests
{
    [Fact]
    public void PublicDisplayName_ShowsOnlySurnameInitial()
    {
        var customer = Customer.Register("ayse@example.com", "hash", "Ayşe", "Kaya", null, false);

        customer.PublicDisplayName.Should().Be("Ayşe K.");
    }
}