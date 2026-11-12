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
    private readonly IWebHostEnvironment _env;

    public RoomsController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    // Uploaded photos live here (served as /uploads/rooms/...).
    private string UploadsFolder => Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "rooms");

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
        room.Type = NormalizeType(room.Type);
        room.ImageUrl = null;   // photos come from POST /api/rooms/{id}/image, not from create

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
        room.Type = NormalizeType(room.Type);

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

    DeleteUploadedFile(room.ImageUrl);
    _db.Rooms.Remove(room);
    await _db.SaveChangesAsync();
    return NoContent();
}

    // POST /api/rooms/{id}/image — upload a photo for a room (multipart form, field name "file").
    // The photo replaces the automatic type photo; only JPG, PNG or WebP, max 5 MB.
    [HttpPost("{id}/image")]
    public async Task<ActionResult> UploadImage(int id, IFormFile file)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room is null) return NotFound();
        if (file is null || file.Length == 0) return BadRequest("Choose an image to upload.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            return BadRequest("Only JPG, PNG or WebP images are allowed.");
        if (file.Length > 5 * 1024 * 1024)
            return BadRequest("Image must be 5 MB or smaller.");

        var folder = UploadsFolder;
        Directory.CreateDirectory(folder);
        var name = $"{room.Id}_{Guid.NewGuid():N}{ext}";
        await using (var stream = System.IO.File.Create(Path.Combine(folder, name)))
        {
            await file.CopyToAsync(stream);
        }

        DeleteUploadedFile(room.ImageUrl);
        room.ImageUrl = $"/uploads/rooms/{name}";
        await _db.SaveChangesAsync();
        return Ok(new { imageUrl = room.ImageUrl });
    }

    // DELETE /api/rooms/{id}/image — remove the uploaded photo, back to the automatic type photo.
    [HttpDelete("{id}/image")]
    public async Task<IActionResult> RemoveImage(int id)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room is null) return NotFound();

        DeleteUploadedFile(room.ImageUrl);
        room.ImageUrl = null;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Only ever deletes files we created under wwwroot/uploads/rooms.
    private void DeleteUploadedFile(string? imageUrl)
    {
        if (string.IsNullOrEmpty(imageUrl)) return;
        const string prefix = "/uploads/rooms/";
        if (!imageUrl.StartsWith(prefix, StringComparison.Ordinal)) return;
        var path = Path.Combine(UploadsFolder, Path.GetFileName(imageUrl[prefix.Length..]));
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
    }

    // ' studio ' -> 'Studio'; unknown values are left as-is so validation can reject them.
    private static string? NormalizeType(string? type)
    {
        if (string.IsNullOrWhiteSpace(type)) return null;
        var t = type.Trim();
        return t.ToLowerInvariant() switch
        {
            "single" => "Single",
            "double-deck" => "Double-deck",
            "studio" => "Studio",
            "bed spacer" => "Bed Spacer",
            _ => t
        };
    }

    // (Status, Message) if there is a problem, null if OK.
    // Duplicate = another room with the same room number (case-insensitive).
    // The room being edited does not count as a duplicate of itself.
    private async Task<(int Status, string Message)?> ValidateRoomAsync(Room room, int? roomId)
    {
        var roomNo = room.RoomNo?.Trim() ?? string.Empty;
        if (roomNo.Length == 0) return (400, "Enter a room number.");

        if (room.Type is not null && room.Type is not ("Single" or "Double-deck" or "Studio" or "Bed Spacer"))
            return (400, "Room type must be Single, Double-deck, Studio or Bed Spacer.");

        var duplicate = await _db.Rooms
            .AnyAsync(r => r.Id != roomId && r.RoomNo.Trim().ToLower() == roomNo.ToLower());

        if (duplicate)
            return (409, $"There is already a room with number {roomNo}.");

        return null;
    }
}
