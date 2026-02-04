public interface IOrderService
{
    Task<PagedResultDto<OrderDto>> GetCustomerOrdersAsync(
        int customerId,
        int page,
        int pageSize,
        DateTime? fromDate,
        DateTime? toDate,
        decimal? minAmount,
        decimal? maxAmount);
}
