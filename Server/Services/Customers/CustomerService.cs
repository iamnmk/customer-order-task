using Microsoft.EntityFrameworkCore;

public class CustomerService : ICustomerService
{
    private readonly AppDbContext _db;

    private readonly IOrderJobManager _jobManager;

    public CustomerService(AppDbContext db, IOrderJobManager jobManager)
    {
        _db = db;
        _jobManager = jobManager;
    }


    public async Task<List<CustomerDto>> GetAllAsync()
    {
        return await _db.Customers
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CustomerDto
            {
                Id = c.Id,
                Name = c.Name,
                Email = c.Email,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<CustomerDto?> GetByIdAsync(int id)
    {
        var c = await _db.Customers.FindAsync(id);
        if (c == null) return null;

        return new CustomerDto
        {
            Id = c.Id,
            Name = c.Name,
            Email = c.Email,
            IsActive = c.IsActive,
            CreatedAt = c.CreatedAt
        };
    }

    public async Task<CustomerDto> CreateAsync(CreateCustomerDto dto)
    {
        var customer = new Customer
        {
            Name = dto.Name,
            Email = dto.Email,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();
        _jobManager.StartJob(customer.Id);

        return new CustomerDto
        {
            Id = customer.Id,
            Name = customer.Name,
            Email = customer.Email,
            IsActive = customer.IsActive,
            CreatedAt = customer.CreatedAt
        };
    }

    public async Task<bool> UpdateAsync(int id, UpdateCustomerDto dto)
    {
        var customer = await _db.Customers.FindAsync(id);
        if (customer == null) return false;

        customer.Name = dto.Name;
        customer.Email = dto.Email;
        customer.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var customer = await _db.Customers.FindAsync(id);
        if (customer == null) return false;

        _db.Customers.Remove(customer);
        await _db.SaveChangesAsync();
        _jobManager.StopJob(id);

        return true;
    }
}
