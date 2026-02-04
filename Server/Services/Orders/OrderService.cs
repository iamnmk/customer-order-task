using Microsoft.EntityFrameworkCore;

public class OrderService : IOrderService
{
    private readonly AppDbContext _db;

    public OrderService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResultDto<OrderDto>> GetCustomerOrdersAsync(
        int customerId,
        int page,
        int pageSize,
        DateTime? fromDate,
        DateTime? toDate,
        decimal? minAmount,
        decimal? maxAmount)
    {
        // Base query: only this customer's orders
        var query = _db.Orders
            .AsNoTracking()
            .Where(o => o.CustomerId == customerId);

        // Filters
        if (fromDate.HasValue)
            query = query.Where(o => o.CreatedAt >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(o => o.CreatedAt <= toDate.Value);

        if (minAmount.HasValue)
            query = query.Where(o => o.Amount >= minAmount.Value);

        if (maxAmount.HasValue)
            query = query.Where(o => o.Amount <= maxAmount.Value);

        // Total count before pagination
        var totalCount = await query.CountAsync();

        // Pagination + latest first
        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OrderDto
            {
                Id = o.Id,
                Description = o.Description,
                Amount = o.Amount,
                CreatedAt = o.CreatedAt
            })
            .ToListAsync();

        return new PagedResultDto<OrderDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }
}
