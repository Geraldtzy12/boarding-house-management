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
        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = room.Id }, room);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Room room)
    {
        if (id != room.Id) return BadRequest();
        if (!await _db.Rooms.AnyAsync(r => r.Id == id)) return NotFound();

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
        return Conflict("May tenant pa sa room na ito.");

    _db.Rooms.Remove(room);
    await _db.SaveChangesAsync();
    return NoContent();
}
}