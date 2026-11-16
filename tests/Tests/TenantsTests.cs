using System.Net;
using System.Text.Json;

namespace BoardingHouse.Api.Tests;

public class TenantsTests : ApiTestBase
{
    [Fact]
    public async Task Create_tenant_flips_room_to_Occupied()
    {
        await AuthorizeAsync();
        var roomId = await CreateRoomAsync("101");
        await CreateTenantAsync("Juan Dela Cruz", "09170000001", roomId);

        var (_, body) = await GetAsync($"/api/rooms/{roomId}");
        Assert.Equal("Occupied", JsonDocument.Parse(body).RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Duplicate_name_with_different_case_is_blocked()
    {
        await AuthorizeAsync();
        var room1 = await CreateRoomAsync("101");
        var room2 = await CreateRoomAsync("102");
        await CreateTenantAsync("ANgel", "09103029939", room1);

        var (status, body) = await PostJsonAsync("/api/tenants",
            new { name = "angel", contact = "09121323301", roomId = room2, leaseStart = "2026-11-11", isActive = true });
        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Contains("There is already a tenant named angel.", body);
    }

    [Fact]
    public async Task Duplicate_name_with_spaces_is_blocked()
    {
        await AuthorizeAsync();
        var room1 = await CreateRoomAsync("101");
        var room2 = await CreateRoomAsync("102");
        await CreateTenantAsync("Angel", "09170000001", room1);

        var (status, _) = await PostJsonAsync("/api/tenants",
            new { name = " ANGEL ", contact = "09998887777", roomId = room2, leaseStart = "2026-11-11", isActive = true });
        Assert.Equal(HttpStatusCode.Conflict, status);
    }

    [Fact]
    public async Task Same_contact_number_with_a_different_name_is_blocked()
    {
        await AuthorizeAsync();
        var room1 = await CreateRoomAsync("101");
        var room2 = await CreateRoomAsync("102");
        await CreateTenantAsync("Gerald Bonalos", "09213021330", room1);

        var (status, body) = await PostJsonAsync("/api/tenants",
            new { name = "Maria", contact = "09213021330", roomId = room2, leaseStart = "2026-11-11", isActive = true });
        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Contains("already used by Gerald Bonalos", body);
    }

    [Fact]
    public async Task Same_number_with_dashes_is_blocked()
    {
        await AuthorizeAsync();
        var room1 = await CreateRoomAsync("101");
        var room2 = await CreateRoomAsync("102");
        await CreateTenantAsync("Gerald Bonalos", "09213021330", room1);

        var (status, _) = await PostJsonAsync("/api/tenants",
            new { name = "Maria", contact = "0921-302-1330", roomId = room2, leaseStart = "2026-11-11", isActive = true });
        Assert.Equal(HttpStatusCode.Conflict, status);
    }

    [Fact]
    public async Task Edit_tenant_to_a_duplicate_name_is_blocked()
    {
        await AuthorizeAsync();
        var room1 = await CreateRoomAsync("101");
        var room2 = await CreateRoomAsync("102");
        await CreateTenantAsync("Angel", "09170000001", room1);
        var geraldId = await CreateTenantAsync("Gerald Bonalos", "09213021330", room2);

        var (status, _) = await PutJsonAsync($"/api/tenants/{geraldId}",
            new { id = geraldId, name = "angel", contact = "09213021330", roomId = room2, leaseStart = "2026-11-09", isActive = true });
        Assert.Equal(HttpStatusCode.Conflict, status);
    }

    [Fact]
    public async Task Edit_tenant_keeping_own_name_succeeds()
    {
        await AuthorizeAsync();
        var roomId = await CreateRoomAsync("101");
        var tenantId = await CreateTenantAsync("Gerald Bonalos", "09213021330", roomId);

        var (status, _) = await PutJsonAsync($"/api/tenants/{tenantId}",
            new { id = tenantId, name = "Gerald Bonalos", contact = "09213021330", roomId, leaseStart = "2026-11-09", isActive = true });
        Assert.Equal(HttpStatusCode.NoContent, status);
    }

    [Fact]
    public async Task Second_tenant_in_an_occupied_room_is_blocked()
    {
        await AuthorizeAsync();
        var roomId = await CreateRoomAsync("101", capacity: 2);
        await CreateTenantAsync("Juan Dela Cruz", "09170000001", roomId);

        var (status, body) = await PostJsonAsync("/api/tenants",
            new { name = "Maria", contact = "09170000002", roomId, leaseStart = "2026-11-11", isActive = true });
        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Contains("already occupied", body);
    }

    [Fact]
    public async Task Move_out_frees_the_room_and_the_name_can_be_reused()
    {
        await AuthorizeAsync();
        var room1 = await CreateRoomAsync("101");
        var room2 = await CreateRoomAsync("102");
        var tenantId = await CreateTenantAsync("Angel", "09170000001", room1);

        var (moveOutStatus, _) = await PostJsonAsync($"/api/tenants/{tenantId}/move-out", new { });
        Assert.Equal(HttpStatusCode.NoContent, moveOutStatus);

        var (_, roomsBody) = await GetAsync($"/api/rooms/{room1}");
        Assert.Equal("Vacant", JsonDocument.Parse(roomsBody).RootElement.GetProperty("status").GetString());

        await CreateTenantAsync("angel", "09121323301", room2);
    }

    [Fact]
    public async Task Create_tenant_without_name_or_contact_returns_400()
    {
        await AuthorizeAsync();
        var roomId = await CreateRoomAsync("101");

        var (noName, _) = await PostJsonAsync("/api/tenants",
            new { name = "", contact = "09170000001", roomId, leaseStart = "2026-11-11", isActive = true });
        Assert.Equal(HttpStatusCode.BadRequest, noName);

        var (noContact, _) = await PostJsonAsync("/api/tenants",
            new { name = "Maria", contact = "", roomId, leaseStart = "2026-11-11", isActive = true });
        Assert.Equal(HttpStatusCode.BadRequest, noContact);
    }

    [Fact]
    public async Task Create_tenant_with_short_or_long_contact_returns_400()
    {
        await AuthorizeAsync();
        var roomId = await CreateRoomAsync("101");

        var (shortNumber, shortBody) = await PostJsonAsync("/api/tenants",
            new { name = "Maria", contact = "091700000", roomId, leaseStart = "2026-11-11", isActive = true });
        Assert.Equal(HttpStatusCode.BadRequest, shortNumber);
        Assert.Contains("11 digits", shortBody);

        var (longNumber, _) = await PostJsonAsync("/api/tenants",
            new { name = "Maria", contact = "0917000000111", roomId, leaseStart = "2026-11-11", isActive = true });
        Assert.Equal(HttpStatusCode.BadRequest, longNumber);
    }
}
