namespace BookStore.Application.Common;

public sealed class ConcurrencyConflictException(string message, Exception? inner = null)
    : Exception(message, inner);