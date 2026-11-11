using BoardingHouse.Api.Data;
using BoardingHouse.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardingHouse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TenantsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TenantsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<Tenant>>> GetAll([FromQuery] bool includeInactive = false)
    {
        var query = _db.Tenants.Include(t => t.Room).AsQueryable();
        if (!includeInactive) query = query.Where(t => t.IsActive);
        return await query.OrderBy(t => t.Name).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Tenant>> Get(int id)
    {
        var tenant = await _db.Tenants.Include(t => t.Room).FirstOrDefaultAsync(t => t.Id == id);
        return tenant is null ? NotFound() : tenant;
    }

    [HttpPost]
    public async Task<ActionResult<Tenant>> Create(Tenant tenant)
    {
        tenant.Room = null;       // Only RoomId is used
        tenant.IsActive = true;
        tenant.Name = tenant.Name?.Trim() ?? string.Empty;
        tenant.Contact = tenant.Contact?.Trim() ?? string.Empty;

        var validation = await ValidateTenantAsync(tenant, null);
        if (validation is not null) return StatusCode(validation.Value.Status, validation.Value.Message);

        _db.Tenants.Add(tenant);
        await _db.SaveChangesAsync();
        await SyncRoomStatus(tenant.RoomId);

        return CreatedAtAction(nameof(Get), new { id = tenant.Id }, tenant);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Tenant tenant)
    {
        if (id != tenant.Id) return BadRequest();

        var existing = await _db.Tenants.FindAsync(id);
        if (existing is null) return NotFound();

        tenant.Name = tenant.Name?.Trim() ?? string.Empty;
        tenant.Contact = tenant.Contact?.Trim() ?? string.Empty;

        var validation = await ValidateTenantAsync(tenant, id);
        if (validation is not null) return StatusCode(validation.Value.Status, validation.Value.Message);

        var oldRoomId = existing.RoomId;
        existing.Name = tenant.Name;
        existing.Contact = tenant.Contact;
        existing.RoomId = tenant.RoomId;
        existing.LeaseStart = tenant.LeaseStart;
        await _db.SaveChangesAsync();

        await SyncRoomStatus(oldRoomId);
        await SyncRoomStatus(existing.RoomId);
        return NoContent();
    }

    [HttpPost("{id}/move-out")]
    public async Task<IActionResult> MoveOut(int id)
    {
        var tenant = await _db.Tenants.FindAsync(id);
        if (tenant is null) return NotFound();

        var oldRoomId = tenant.RoomId;
        tenant.RoomId = null;
        tenant.IsActive = false;
        await _db.SaveChangesAsync();

        await SyncRoomStatus(oldRoomId);
        return NoContent();
    }

    // (Status, Message) if there is a problem, null if OK.
    // Duplicate = another active tenant with the same name (case-insensitive,
    // "ANgel" and "angel" are the same person) OR the same contact number
    // ("0921-302-133" and "0921302133" are the same number).
    // Occupied = another active tenant is already in the room, whatever its capacity.
    // The tenant being edited does not count as occupying their own room.
    private async Task<(int Status, string Message)?> ValidateTenantAsync(Tenant tenant, int? tenantId)
    {
        var name = tenant.Name?.Trim() ?? string.Empty;
        var contact = NormalizeContact(tenant.Contact);

        if (name.Length == 0) return (400, "Enter a name for the tenant.");
        if (contact.Length == 0) return (400, "Enter a contact number for the tenant.");

        var activeTenants = await _db.Tenants
            .Where(t => t.IsActive && (tenantId == null || t.Id != tenantId))
            .Select(t => new { t.Name, t.Contact })
            .ToListAsync();

        var sameName = activeTenants.FirstOrDefault(t =>
            string.Equals(t.Name?.Trim(), name, StringComparison.OrdinalIgnoreCase));
        if (sameName is not null)
            return (409, $"There is already a tenant named {name}.");

        var sameNumber = activeTenants.FirstOrDefault(t =>
            NormalizeContact(t.Contact) == contact);
        if (sameNumber is not null)
            return (409, $"The contact number {tenant.Contact?.Trim()} is already used by {sameNumber.Name?.Trim()}.");

        if (tenant.RoomId is null) return null;

        var room = await _db.Rooms.FindAsync(tenant.RoomId);
        if (room is null) return (400, "Room not found.");

        var occupiedByOther = await _db.Tenants
            .AnyAsync(t => t.RoomId == tenant.RoomId && t.IsActive && t.Id != tenantId);

        if (occupiedByOther)
            return (409, $"Room {room.RoomNo} is already occupied. Please choose another room.");

        return null;
    }

    // "0917-123 4567" and "09171234567" are the same number
    private static string NormalizeContact(string? contact) =>
        new string((contact ?? "").Where(char.IsDigit).ToArray());

    // Occupied if it has a tenant, Vacant if not
    private async Task SyncRoomStatus(int? roomId)
    {
        if (roomId is null) return;

        var room = await _db.Rooms.FindAsync(roomId);
        if (room is null) return;

        var hasTenants = await _db.Tenants.AnyAsync(t => t.RoomId == roomId && t.IsActive);
        room.Status = hasTenants ? RoomStatus.Occupied : RoomStatus.Vacant;
        await _db.SaveChangesAsync();
    }
}
