namespace BookStore.Application.Common;

/// Thrown by the unit of work when a unique index rejects a write. Almost
/// always two requests racing past the same "does it exist?" check.
public sealed class DuplicateEntryException(string message, Exception? inner = null)
    : Exception(message, inner);