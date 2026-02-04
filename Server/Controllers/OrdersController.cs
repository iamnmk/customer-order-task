using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/customers/{customerId}/orders")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orders;

    public OrdersController(IOrderService orders)
    {
        _orders = orders;
    }

    [HttpGet]
    public async Task<IActionResult> GetCustomerOrders(
        int customerId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] decimal? minAmount = null,
        [FromQuery] decimal? maxAmount = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 10;

        var result = await _orders.GetCustomerOrdersAsync(
            customerId, page, pageSize, fromDate, toDate, minAmount, maxAmount);

        return Ok(result);
    }
}

