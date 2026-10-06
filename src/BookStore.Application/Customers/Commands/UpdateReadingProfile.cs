using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Domain.Books;
using BookStore.Domain.Customers;
using FluentValidation;

namespace BookStore.Application.Customers.Commands;

public sealed record UpdateReadingProfileCommand(
    int CustomerId, ReaderLevel? ReadingLevel, decimal? MonthlyBudget, IReadOnlyList<int>? InterestCategoryIds)
    : ICommand<CustomerProfileDto>;

public sealed class UpdateReadingProfileCommandValidator : AbstractValidator<UpdateReadingProfileCommand>
{
    public UpdateReadingProfileCommandValidator()
    {
        RuleFor(x => x.ReadingLevel).IsInEnum().When(x => x.ReadingLevel.HasValue);
        RuleFor(x => x.MonthlyBudget).InclusiveBetween(0, Customer.MaxMonthlyBudget).When(x => x.MonthlyBudget.HasValue);
        RuleFor(x => x.InterestCategoryIds!.Count).LessThanOrEqualTo(Customer.MaxInterests).When(x => x.InterestCategoryIds is not null);
        RuleFor(x => x.InterestCategoryIds)
            .Must(ids => ids is null || ids.Distinct().Count() == ids.Count)
            .WithMessage("Each interest can appear only once.");
    }
}

public sealed class UpdateReadingProfileCommandHandler(
    ICustomerRepository customerRepository,
    ICategoryRepository categoryRepository,
    IUnitOfWork unitOfWork)
    : ICommandHandler<UpdateReadingProfileCommand, CustomerProfileDto>
{
    public async Task<Result<CustomerProfileDto>> Handle(UpdateReadingProfileCommand command, CancellationToken ct)
    {
        var customer = await customerRepository.GetByIdAsync(command.CustomerId, ct);
        if (customer is null || !customer.IsActive)
            return Result.Failure<CustomerProfileDto>(CustomerErrors.AccountUnavailable);

        var interests = command.InterestCategoryIds ?? [];
        if (interests.Count > 0)
        {
            var active = (await categoryRepository.ListAsync(includeInactive: false, ct)).Select(c => c.Id).ToHashSet();
            var unknown = interests.Where(id => !active.Contains(id)).ToList();

            if (unknown.Count > 0)
                return Result.Failure<CustomerProfileDto>(Error.Validation(
                    "Customer.UnknownInterests", $"Unknown category id(s): {string.Join(", ", unknown)}."));
        }

        customer.SetReadingProfile(command.ReadingLevel, command.MonthlyBudget, interests);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(customer.ToProfileDto());
    }
}