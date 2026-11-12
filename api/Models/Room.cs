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

    // Room type: 'Single', 'Double-deck', 'Studio' or 'Bed Spacer' (null = not set).
    // Decides which default photo the room shows.
    public string? Type { get; set; }

    // Uploaded photo, e.g. '/uploads/rooms/3_ab12cd34.webp' (null = use the type photo).
    // Set only by POST /api/rooms/{id}/image, never by the normal create/update.
    public string? ImageUrl { get; set; }
}
