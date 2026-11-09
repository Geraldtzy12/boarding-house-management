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
        tenant.Room = null;       // RoomId lang ang gagamitin
        tenant.IsActive = true;

        var error = await ValidateRoom(tenant.RoomId, null);
        if (error is not null) return BadRequest(error);

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

        var error = await ValidateRoom(tenant.RoomId, id);
        if (error is not null) return BadRequest(error);

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

    // May error message kung hindi pwede ang room, null kung okay
    private async Task<string?> ValidateRoom(int? roomId, int? tenantId)
    {
        if (roomId is null) return null;

        var room = await _db.Rooms.FindAsync(roomId);
        if (room is null) return "Hindi nahanap ang room.";

        var occupants = await _db.Tenants
            .CountAsync(t => t.RoomId == roomId && t.IsActive && t.Id != tenantId);

        if (occupants >= room.Capacity)
            return $"Puno na ang Room {room.RoomNo} (capacity {room.Capacity}).";

        return null;
    }

    // Occupied kung may tenant, Vacant kung wala
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