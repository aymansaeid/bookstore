using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Shipping;
using FluentValidation;

namespace BookStore.Application.Customers.Commands;

public sealed record SaveAddressData(
    string Label, string RecipientName, string Phone, string Line1, string? Line2,
    string City, string? StateOrProvince, string PostalCode, string CountryCode);

public sealed class SaveAddressDataValidator : AbstractValidator<SaveAddressData>
{
    public SaveAddressDataValidator()
    {
        RuleFor(x => x.Label).NotEmpty().MaximumLength(50);
        RuleFor(x => x.RecipientName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(30);
        RuleFor(x => x.Line1).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Line2).MaximumLength(300);
        RuleFor(x => x.City).NotEmpty().MaximumLength(150);
        RuleFor(x => x.StateOrProvince).MaximumLength(150);
        RuleFor(x => x.PostalCode).NotEmpty().MaximumLength(20);
        RuleFor(x => x.CountryCode)
            .NotEmpty()
            .Must(CountryCodes.IsValid)
            .WithMessage("'{PropertyValue}' is not a valid country code.");
    }
}

public sealed record AddCustomerAddressCommand(int CustomerId, SaveAddressData Address, bool IsDefault)
    : ICommand<CustomerAddressDto>;

public sealed class AddCustomerAddressCommandValidator : AbstractValidator<AddCustomerAddressCommand>
{
    public AddCustomerAddressCommandValidator()
    {
        RuleFor(x => x.Address).NotNull().SetValidator(new SaveAddressDataValidator());
    }
}

public sealed class AddCustomerAddressCommandHandler(ICustomerRepository customerRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<AddCustomerAddressCommand, CustomerAddressDto>
{
    public async Task<Result<CustomerAddressDto>> Handle(AddCustomerAddressCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null || !customer.IsActive)
            return Result.Failure<CustomerAddressDto>(CustomerErrors.AccountUnavailable);

        if (customer.Addresses.Count >= Domain.Customers.Customer.MaxAddresses)
            return Result.Failure<CustomerAddressDto>(CustomerErrors.AddressLimitReached);

        var a = command.Address;
        var address = customer.AddAddress(
            a.Label, a.RecipientName, a.Phone, a.Line1, a.Line2,
            a.City, a.StateOrProvince, a.PostalCode, a.CountryCode, command.IsDefault);

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success(address.ToDto());
    }
}

public sealed record UpdateCustomerAddressCommand(int CustomerId, int AddressId, SaveAddressData Address)
    : ICommand<CustomerAddressDto>;

public sealed class UpdateCustomerAddressCommandValidator : AbstractValidator<UpdateCustomerAddressCommand>
{
    public UpdateCustomerAddressCommandValidator()
    {
        RuleFor(x => x.AddressId).GreaterThan(0);
        RuleFor(x => x.Address).NotNull().SetValidator(new SaveAddressDataValidator());
    }
}

public sealed class UpdateCustomerAddressCommandHandler(ICustomerRepository customerRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<UpdateCustomerAddressCommand, CustomerAddressDto>
{
    public async Task<Result<CustomerAddressDto>> Handle(UpdateCustomerAddressCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null || !customer.IsActive)
            return Result.Failure<CustomerAddressDto>(CustomerErrors.AccountUnavailable);

        if (customer.Addresses.All(x => x.Id != command.AddressId))
            return Result.Failure<CustomerAddressDto>(CustomerErrors.AddressNotFound(command.AddressId));

        var a = command.Address;
        customer.UpdateAddress(
            command.AddressId, a.Label, a.RecipientName, a.Phone, a.Line1, a.Line2,
            a.City, a.StateOrProvince, a.PostalCode, a.CountryCode);

        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(customer.Addresses.First(x => x.Id == command.AddressId).ToDto());
    }
}

public sealed record DeleteCustomerAddressCommand(int CustomerId, int AddressId) : ICommand;

public sealed class DeleteCustomerAddressCommandHandler(ICustomerRepository customerRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteCustomerAddressCommand>
{
    public async Task<Result> Handle(DeleteCustomerAddressCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null || !customer.IsActive)
            return Result.Failure(CustomerErrors.AccountUnavailable);

        if (customer.Addresses.All(x => x.Id != command.AddressId))
            return Result.Failure(CustomerErrors.AddressNotFound(command.AddressId));

        customer.RemoveAddress(command.AddressId);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}

public sealed record SetDefaultCustomerAddressCommand(int CustomerId, int AddressId) : ICommand;

public sealed class SetDefaultCustomerAddressCommandHandler(ICustomerRepository customerRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetDefaultCustomerAddressCommand>
{
    public async Task<Result> Handle(SetDefaultCustomerAddressCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null || !customer.IsActive)
            return Result.Failure(CustomerErrors.AccountUnavailable);

        if (customer.Addresses.All(x => x.Id != command.AddressId))
            return Result.Failure(CustomerErrors.AddressNotFound(command.AddressId));

        customer.SetDefaultAddress(command.AddressId);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }
}