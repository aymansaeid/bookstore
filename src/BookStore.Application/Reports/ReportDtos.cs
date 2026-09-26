namespace BookStore.Application.Reports;

public sealed record DailyRevenueDto(DateOnly Date, decimal Revenue, int Orders);

public sealed record CountryBreakdownDto(string CountryCode, string CountryName, int Orders, decimal Revenue);

public sealed record LowStockBookDto(int BookId, string Title, int AvailableToSell, int LowStockThreshold, int WaitingListCount);

public sealed record DashboardDto(
    DateOnly From,
    DateOnly To,
    string Currency,
    decimal Revenue,
    int PaidOrders,
    decimal AverageOrderValue,
    int UnitsSold,
    int OrdersAwaitingShipment,
    IReadOnlyDictionary<string, int> OrdersByStatus,
    IReadOnlyList<DailyRevenueDto> DailyRevenue,
    IReadOnlyList<CountryBreakdownDto> TopCountries,
    IReadOnlyList<LowStockBookDto> LowStock);

public sealed record CsvFileDto(byte[] Content, string FileName);