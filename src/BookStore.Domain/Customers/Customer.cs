using BookStore.Domain.Common;
using BookStore.Domain.Customers.Events;

namespace BookStore.Domain.Customers;

public sealed class Customer : AggregateRoot<int>
{
    public const int MaxAddresses = 10;

    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string? Phone { get; private set; }

    public bool IsEmailVerified { get; private set; }
    public DateTimeOffset? EmailVerifiedAtUtc { get; private set; }
    public bool IsActive { get; private set; }
    public bool IsAnonymized { get; private set; }

    public bool AcceptsMarketingEmails { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? LastLoginAtUtc { get; private set; }

    private readonly List<CustomerAddress> _addresses = [];
    public IReadOnlyCollection<CustomerAddress> Addresses => _addresses.AsReadOnly();

    public byte[] RowVersion { get; private set; } = [];

    public string FullName => $"{FirstName} {LastName}".Trim();

    private Customer() { } // EF Core

    public static Customer Register(
        string email, string passwordHash, string firstName, string lastName,
        string? phone, bool acceptsMarketingEmails)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new ArgumentException("A valid email is required.", nameof(email));
        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("Password hash is required.", nameof(passwordHash));
        if (string.IsNullOrWhiteSpace(firstName))
            throw new ArgumentException("First name is required.", nameof(firstName));
        if (string.IsNullOrWhiteSpace(lastName))
            throw new ArgumentException("Last name is required.", nameof(lastName));

        var customer = new Customer
        {
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHash,
            FirstName = firstName.Trim(),
            LastName = lastName.Trim(),
            Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim(),
            AcceptsMarketingEmails = acceptsMarketingEmails,
            IsEmailVerified = false,
            IsActive = true,
            IsAnonymized = false,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        customer.Raise(new CustomerRegisteredDomainEvent(customer.Email, DateTimeOffset.UtcNow));
        return customer;
    }

    /// Raises an event so past guest orders with this address can be
    /// attached — deliberately only after verification, or anyone could
    /// claim someone else's order history by registering their email.
    public void VerifyEmail()
    {
        if (IsEmailVerified)
            return; // Idempotent: clicking the link twice isn't an error.

        IsEmailVerified = true;
        EmailVerifiedAtUtc = DateTimeOffset.UtcNow;

        Raise(new CustomerEmailVerifiedDomainEvent(Id, Email, DateTimeOffset.UtcNow));
    }

    public void UpdateProfile(string firstName, string lastName, string? phone, bool acceptsMarketingEmails)
    {
        if (string.IsNullOrWhiteSpace(firstName))
            throw new ArgumentException("First name is required.", nameof(firstName));
        if (string.IsNullOrWhiteSpace(lastName))
            throw new ArgumentException("Last name is required.", nameof(lastName));

        FirstName = firstName.Trim();
        LastName = lastName.Trim();
        Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
        AcceptsMarketingEmails = acceptsMarketingEmails;
    }

    public void ChangePasswordHash(string newPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(newPasswordHash))
            throw new ArgumentException("Password hash is required.", nameof(newPasswordHash));

        PasswordHash = newPasswordHash;
    }

    public void RecordLogin() => LastLoginAtUtc = DateTimeOffset.UtcNow;

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;

    /// KVKK "delete my account": scrubs personal data but keeps the row, so
    /// orders stay linked for invoicing. The email is replaced with a unique
    /// placeholder to satisfy the unique index without being reusable.
    public void Anonymize()
    {
        Email = $"deleted-{Guid.NewGuid():N}@anonymized.invalid";
        PasswordHash = string.Empty;
        FirstName = "Deleted";
        LastName = "User";
        Phone = null;
        AcceptsMarketingEmails = false;
        IsActive = false;
        IsAnonymized = true;
        _addresses.Clear();
    }

    public CustomerAddress AddAddress(
        string label, string recipientName, string phone, string line1, string? line2,
        string city, string? stateOrProvince, string postalCode, string countryCode, bool isDefault)
    {
        if (_addresses.Count >= MaxAddresses)
            throw new InvalidOperationException($"A customer can save at most {MaxAddresses} addresses.");

        // First address is always the default, so checkout never has to
        // guess which one to prefill.
        var makeDefault = isDefault || _addresses.Count == 0;

        if (makeDefault)
            foreach (var existing in _addresses)
                existing.SetDefault(false);

        var address = CustomerAddress.Create(
            label, recipientName, phone, line1, line2, city, stateOrProvince, postalCode, countryCode, makeDefault);

        _addresses.Add(address);
        return address;
    }

    public void UpdateAddress(
        int addressId, string label, string recipientName, string phone, string line1, string? line2,
        string city, string? stateOrProvince, string postalCode, string countryCode)
    {
        var address = FindAddress(addressId);
        address.Update(label, recipientName, phone, line1, line2, city, stateOrProvince, postalCode, countryCode);
    }

    public void RemoveAddress(int addressId)
    {
        var address = FindAddress(addressId);
        var wasDefault = address.IsDefault;

        _addresses.Remove(address);

        if (wasDefault && _addresses.Count > 0)
            _addresses[0].SetDefault(true);
    }

    public void SetDefaultAddress(int addressId)
    {
        var address = FindAddress(addressId);

        foreach (var existing in _addresses)
            existing.SetDefault(false);

        address.SetDefault(true);
    }

    private CustomerAddress FindAddress(int addressId) =>
        _addresses.FirstOrDefault(a => a.Id == addressId)
        ?? throw new InvalidOperationException($"Address {addressId} does not belong to this customer.");

    /// What appears publicly on reviews: first name and surname initial.
    public string PublicDisplayName =>
        string.IsNullOrEmpty(LastName) ? FirstName : $"{FirstName} {LastName[0]}.";
}