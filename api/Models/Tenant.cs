namespace BoardingHouse.Api.Models;

public class Tenant
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    public int? RoomId { get; set; }
    public Room? Room { get; set; }
    public DateOnly LeaseStart { get; set; }
    public bool IsActive { get; set; } = true;
}