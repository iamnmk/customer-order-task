using Microsoft.AspNetCore.SignalR;

public class OrdersHub : Hub
{
    // Customers join a group based on customerId
    public Task JoinCustomerGroup(int customerId)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, $"customer-{customerId}");
    }

    public Task LeaveCustomerGroup(int customerId)
    {
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, $"customer-{customerId}");
    }
}
