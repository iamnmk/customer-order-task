public class CreateCustomerDto
{
    public string Name { get; set; }
    public string Email { get; set; }
    public bool IsActive { get; set; } = true;
}