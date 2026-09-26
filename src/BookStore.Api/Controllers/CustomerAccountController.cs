using BookStore.Api.Common;
using BookStore.Application.Customers;
using BookStore.Application.Customers.Commands;
using BookStore.Application.Customers.Queries;
using BookStore.Application.Orders;
using BookStore.Application.Reviews;
using BookStore.Application.Reviews.Commands;
using BookStore.Application.Reviews.Queries;
using BookStore.Application.Wishlists;
using BookStore.Infrastructure.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace BookStore.Api.Controllers;

public sealed record UpdateProfileRequest(string FirstName, string LastName, string? Phone, bool AcceptsMarketingEmails);
public sealed record ChangeCustomerPasswordRequest(string CurrentPassword, string NewPassword);
public sealed record DeleteAccountRequest(string Password);
public sealed record AddAddressRequest(SaveAddressData Address, bool IsDefault);
public sealed record UpdateAddressRequest(SaveAddressData Address);
public sealed record SubmitReviewRequest(int BookId, int Rating, string? Title, string Body);
public sealed record UpdateReviewRequest(int Rating, string? Title, string Body);

[ApiController]
[Route("api/customers/me")]
[Authorize(AuthenticationSchemes = CustomerTokenGenerator.CustomerScheme)]
public sealed class CustomerAccountController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(CustomerProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProfile(CancellationToken ct) =>
        (await sender.Send(new GetCurrentCustomerQuery(CustomerId()), ct)).ToActionResult();

    [HttpPut]
    [ProducesResponseType(typeof(CustomerProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest r, CancellationToken ct) =>
        (await sender.Send(new UpdateCustomerProfileCommand(
            CustomerId(), r.FirstName, r.LastName, r.Phone, r.AcceptsMarketingEmails), ct)).ToActionResult();

    [HttpPost("change-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ChangePassword(ChangeCustomerPasswordRequest r, CancellationToken ct) =>
        (await sender.Send(new ChangeCustomerPasswordCommand(
            CustomerId(), r.CurrentPassword, r.NewPassword), ct)).ToActionResult();

    [HttpPost("delete")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteAccount(DeleteAccountRequest r, CancellationToken ct)
    {
        var result = await sender.Send(new DeleteCustomerAccountCommand(CustomerId(), r.Password), ct);
        if (result.IsSuccess)
            RefreshTokenCookie.Clear(Response);

        return result.ToActionResult();
    }

    [HttpGet("orders")]
    [ProducesResponseType(typeof(IReadOnlyList<PublicOrderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrders(CancellationToken ct) =>
        (await sender.Send(new GetCustomerOrdersQuery(CustomerId()), ct)).ToActionResult();

    [HttpGet("addresses")]
    [ProducesResponseType(typeof(IReadOnlyList<CustomerAddressDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAddresses(CancellationToken ct) =>
        (await sender.Send(new GetCustomerAddressesQuery(CustomerId()), ct)).ToActionResult();

    [HttpPost("addresses")]
    [ProducesResponseType(typeof(CustomerAddressDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AddAddress(AddAddressRequest r, CancellationToken ct) =>
        (await sender.Send(new AddCustomerAddressCommand(CustomerId(), r.Address, r.IsDefault), ct)).ToActionResult();

    [HttpPut("addresses/{addressId:int}")]
    [ProducesResponseType(typeof(CustomerAddressDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAddress(int addressId, UpdateAddressRequest r, CancellationToken ct) =>
        (await sender.Send(new UpdateCustomerAddressCommand(CustomerId(), addressId, r.Address), ct)).ToActionResult();

    [HttpDelete("addresses/{addressId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAddress(int addressId, CancellationToken ct) =>
        (await sender.Send(new DeleteCustomerAddressCommand(CustomerId(), addressId), ct)).ToActionResult();

    [HttpPut("addresses/{addressId:int}/default")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetDefaultAddress(int addressId, CancellationToken ct) =>
        (await sender.Send(new SetDefaultCustomerAddressCommand(CustomerId(), addressId), ct)).ToActionResult();
    private int CustomerId() => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    [HttpGet("wishlist")]
    [ProducesResponseType(typeof(IReadOnlyList<WishlistItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWishlist(CancellationToken ct) =>
    (await sender.Send(new GetWishlistQuery(CustomerId()), ct)).ToActionResult();

    [HttpPut("wishlist/{bookId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddToWishlist(int bookId, CancellationToken ct) =>
        (await sender.Send(new AddToWishlistCommand(CustomerId(), bookId), ct)).ToActionResult();

    [HttpDelete("wishlist/{bookId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RemoveFromWishlist(int bookId, CancellationToken ct) =>
        (await sender.Send(new RemoveFromWishlistCommand(CustomerId(), bookId), ct)).ToActionResult();

    [HttpGet("reviews")]
    [ProducesResponseType(typeof(IReadOnlyList<MyReviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyReviews(CancellationToken ct) =>
    (await sender.Send(new GetMyReviewsQuery(CustomerId()), ct)).ToActionResult();

    /// Drives the "Write a review" / "Edit your review" button on a book page.
    [HttpGet("reviews/eligibility/{bookId:int}")]
    [ProducesResponseType(typeof(ReviewEligibilityDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReviewEligibility(int bookId, CancellationToken ct) =>
        (await sender.Send(new GetReviewEligibilityQuery(CustomerId(), bookId), ct)).ToActionResult();

    [HttpPost("reviews")]
    [EnableRateLimiting("review-submit")]
    [ProducesResponseType(typeof(MyReviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SubmitReview(SubmitReviewRequest r, CancellationToken ct) =>
        (await sender.Send(new SubmitReviewCommand(CustomerId(), r.BookId, r.Rating, r.Title, r.Body), ct))
        .ToActionResult();

    [HttpPut("reviews/{reviewId:int}")]
    [EnableRateLimiting("review-submit")]
    [ProducesResponseType(typeof(MyReviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateReview(int reviewId, UpdateReviewRequest r, CancellationToken ct) =>
        (await sender.Send(new UpdateMyReviewCommand(CustomerId(), reviewId, r.Rating, r.Title, r.Body), ct))
        .ToActionResult();

    [HttpDelete("reviews/{reviewId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteReview(int reviewId, CancellationToken ct) =>
        (await sender.Send(new DeleteMyReviewCommand(CustomerId(), reviewId), ct)).ToActionResult();
}