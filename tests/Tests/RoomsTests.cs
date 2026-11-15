using System.Net;
using System.Text.Json;

namespace BoardingHouse.Api.Tests;

public class RoomsTests : ApiTestBase
{
    [Fact]
    public async Task Create_room_returns_201()
    {
        await AuthorizeAsync();
        var (status, body) = await PostJsonAsync("/api/rooms",
            new { roomNo = "101", monthlyRate = 2500, capacity = 2, status = "Vacant" });
        Assert.Equal(HttpStatusCode.Created, status);
        Assert.Equal("101", JsonDocument.Parse(body).RootElement.GetProperty("roomNo").GetString());
    }

    [Fact]
    public async Task Duplicate_room_number_is_blocked()
    {
        await AuthorizeAsync();
        await CreateRoomAsync("101");

        var (status, body) = await PostJsonAsync("/api/rooms",
            new { roomNo = "101", monthlyRate = 3000, capacity = 1, status = "Vacant" });
        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Contains("There is already a room with number 101.", body);
    }

    [Fact]
    public async Task Duplicate_room_number_with_spaces_is_blocked()
    {
        await AuthorizeAsync();
        await CreateRoomAsync("101");

        var (status, _) = await PostJsonAsync("/api/rooms",
            new { roomNo = " 101 ", monthlyRate = 3000, capacity = 1, status = "Vacant" });
        Assert.Equal(HttpStatusCode.Conflict, status);
    }

    [Fact]
    public async Task Edit_room_to_a_duplicate_number_is_blocked()
    {
        await AuthorizeAsync();
        await CreateRoomAsync("101");
        var room2 = await CreateRoomAsync("102");

        var (status, _) = await PutJsonAsync($"/api/rooms/{room2}",
            new { id = room2, roomNo = "101", monthlyRate = 3000, capacity = 1, status = "Vacant" });
        Assert.Equal(HttpStatusCode.Conflict, status);
    }

    [Fact]
    public async Task Edit_room_keeping_own_number_succeeds()
    {
        await AuthorizeAsync();
        var roomId = await CreateRoomAsync("101");

        var (status, _) = await PutJsonAsync($"/api/rooms/{roomId}",
            new { id = roomId, roomNo = "101", monthlyRate = 3500, capacity = 2, status = "Vacant" });
        Assert.Equal(HttpStatusCode.NoContent, status);
    }

    [Fact]
    public async Task Delete_room_rules()
    {
        await AuthorizeAsync();
        var occupiedId = await CreateRoomAsync("101");
        var vacantId = await CreateRoomAsync("102");
        await CreateTenantAsync("Juan Dela Cruz", "09170000001", occupiedId);

        var (blocked, body) = await DeleteAsync($"/api/rooms/{occupiedId}");
        Assert.Equal(HttpStatusCode.Conflict, blocked);
        Assert.Contains("still has a tenant", body);

        var (deleted, _) = await DeleteAsync($"/api/rooms/{vacantId}");
        Assert.Equal(HttpStatusCode.NoContent, deleted);
    }

    [Fact]
    public async Task Create_room_without_a_number_returns_400()
    {
        await AuthorizeAsync();
        var (status, _) = await PostJsonAsync("/api/rooms",
            new { roomNo = "   ", monthlyRate = 3000, capacity = 1, status = "Vacant" });
        Assert.Equal(HttpStatusCode.BadRequest, status);
    }
}
