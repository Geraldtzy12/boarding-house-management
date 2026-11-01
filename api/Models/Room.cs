namespace BoardingHouse.Api.Models;

public enum RoomStatus
{
    Vacant,
    Occupied
}

public class Room
{
    public int Id { get; set; }
    public string RoomNo { get; set; } = string.Empty;
    public decimal MonthlyRate { get; set; }
    public int Capacity { get; set; } = 1;
    public RoomStatus Status { get; set; } = RoomStatus.Vacant;
}