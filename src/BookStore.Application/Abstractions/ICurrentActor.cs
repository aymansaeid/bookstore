namespace BookStore.Application.Abstractions;

/// Who is performing the current operation. An admin during an admin
/// request; "System" in background jobs and anonymous requests.
public interface ICurrentActor
{
    int? AdminUserId { get; }
    string DisplayName { get; }
}