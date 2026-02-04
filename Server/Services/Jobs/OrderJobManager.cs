using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

public class OrderJobManager : IOrderJobManager
{
    private readonly IServiceScopeFactory _scopeFactory;

    // customerId -> cancellation token
    private readonly ConcurrentDictionary<int, CancellationTokenSource> _jobs
        = new();
    private readonly IHubContext<OrdersHub> _hub;

    public OrderJobManager(IServiceScopeFactory scopeFactory, IHubContext<OrdersHub> hub)
    {
        _scopeFactory = scopeFactory;
        _hub = hub;
    }

    public void StartJob(int customerId)
    {
        // Prevent duplicate jobs
        if (_jobs.ContainsKey(customerId))
            return;

        var cts = new CancellationTokenSource();
        _jobs[customerId] = cts;

        Task.Run(() => RunJobAsync(customerId, cts.Token));
    }

    public void StopJob(int customerId)
    {
        if (_jobs.TryRemove(customerId, out var cts))
        {
            cts.Cancel();
            cts.Dispose();
        }
    }

    private async Task RunJobAsync(int customerId, CancellationToken token)
    {
        try
        {
            // ✅ 1) Create first order immediately
            await CreateOrderOnceAsync(customerId, token);

            // ✅ 2) Then repeat every 1 minute
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

            while (await timer.WaitForNextTickAsync(token))
            {
                await CreateOrderOnceAsync(customerId, token);
            }
        }
        catch (OperationCanceledException)
        {
            // normal when job is stopped
        }
    }
    private async Task CreateOrderOnceAsync(int customerId, CancellationToken token)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var exists = await db.Customers
            .AnyAsync(c => c.Id == customerId && c.IsActive, token);

        if (!exists)
            return;

        var order = new Order
        {
            CustomerId = customerId,
            Description = "Auto-generated order",
            Amount = Random.Shared.Next(100, 5000),
            CreatedAt = DateTime.UtcNow
        };

        db.Orders.Add(order);
        await db.SaveChangesAsync(token);
        await _hub.Clients
    .Group($"customer-{customerId}")
    .SendAsync("OrderCreated", new
    {
        CustomerId = customerId,
        order.Id,
        order.Amount,
        order.CreatedAt
    }, token);

    }

}

