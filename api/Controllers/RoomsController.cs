using BoardingHouse.Api.Data;
using BoardingHouse.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardingHouse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoomsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<Room>>> GetAll() =>
        await _db.Rooms.OrderBy(r => r.RoomNo).ToListAsync();

    [HttpGet("{id}")]
    public async Task<ActionResult<Room>> Get(int id)
    {
        var room = await _db.Rooms.FindAsync(id);
        return room is null ? NotFound() : room;
    }

    [HttpPost]
    public async Task<ActionResult<Room>> Create(Room room)
    {
        room.RoomNo = room.RoomNo?.Trim() ?? string.Empty;

        var validation = await ValidateRoomAsync(room, null);
        if (validation is not null) return StatusCode(validation.Value.Status, validation.Value.Message);

        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = room.Id }, room);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Room room)
    {
        if (id != room.Id) return BadRequest();
        if (!await _db.Rooms.AnyAsync(r => r.Id == id)) return NotFound();

        room.RoomNo = room.RoomNo?.Trim() ?? string.Empty;

        var validation = await ValidateRoomAsync(room, id);
        if (validation is not null) return StatusCode(validation.Value.Status, validation.Value.Message);

        _db.Entry(room).State = EntityState.Modified;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
public async Task<IActionResult> Delete(int id)
{
    var room = await _db.Rooms.FindAsync(id);
    if (room is null) return NotFound();

    if (await _db.Tenants.AnyAsync(t => t.RoomId == id))
        return Conflict("This room still has a tenant.");

    _db.Rooms.Remove(room);
    await _db.SaveChangesAsync();
    return NoContent();
}

    // (Status, Message) if there is a problem, null if OK.
    // Duplicate = another room with the same room number (case-insensitive).
    // The room being edited does not count as a duplicate of itself.
    private async Task<(int Status, string Message)?> ValidateRoomAsync(Room room, int? roomId)
    {
        var roomNo = room.RoomNo?.Trim() ?? string.Empty;
        if (roomNo.Length == 0) return (400, "Enter a room number.");

        var duplicate = await _db.Rooms
            .AnyAsync(r => r.Id != roomId && r.RoomNo.Trim().ToLower() == roomNo.ToLower());

        if (duplicate)
            return (409, $"There is already a room with number {roomNo}.");

        return null;
    }
}
