using BoardingHouse.Api.Data;
using BoardingHouse.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardingHouse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BillsController : ControllerBase
{
    private readonly AppDbContext _db;

    public BillsController(AppDbContext db) => _db = db;

    // GET /api/bills?status=Overdue&month=2026-11
    [HttpGet]
    public async Task<ActionResult<List<Bill>>> GetAll([FromQuery] string? status, [FromQuery] string? month)
    {
        await RefreshOverdue();

        var query = _db.Bills.Include(b => b.Tenant).Where(b => !b.IsDeleted).AsQueryable();

        if (Enum.TryParse<BillStatus>(status, true, out var parsed))
            query = query.Where(b => b.Status == parsed);

        if (!string.IsNullOrWhiteSpace(month))
            query = query.Where(b => b.Month == month);

        return await query
            .OrderByDescending(b => b.DueDate)
            .ThenBy(b => b.RoomNo)
            .ToListAsync();
    }

    // POST /api/bills  (manual: electricity, water, rent, etc.)
    [HttpPost]
    public async Task<IActionResult> Create(CreateBillRequest request)
    {
        if (request.Amount <= 0)
            return BadRequest("The amount must be greater than 0.");

        if (string.IsNullOrWhiteSpace(request.Month) || ParseMonth(request.Month) is null)
            return BadRequest("Use the yyyy-MM format, for example 2026-11.");

        var tenant = await _db.Tenants
            .Include(t => t.Room)
            .FirstOrDefaultAsync(t => t.Id == request.TenantId);

        if (tenant is null || !tenant.IsActive || tenant.Room is null)
            return BadRequest("Choose an active tenant with a room.");

        var exists = await _db.Bills.AnyAsync(b =>
            !b.IsDeleted && b.TenantId == request.TenantId && b.Month == request.Month && b.Type == request.Type);

        if (exists)
            return Conflict($"{tenant.Name} already has a {request.Type} bill for {request.Month}.");

        var bill = new Bill
        {
            TenantId = tenant.Id,
            RoomNo = tenant.Room.RoomNo,
            Type = request.Type,
            Month = request.Month,
            Amount = request.Amount,
            DueDate = request.DueDate,
            Status = BillStatus.Pending,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim()
        };

        _db.Bills.Add(bill);
        await _db.SaveChangesAsync();
        await RefreshOverdue();

        return Ok(bill);
    }

    // POST /api/bills/generate?month=2026-11  (Rent only; no month = current month)
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromQuery] string? month)
    {
        var first = ParseMonth(month);
        if (first is null)
            return BadRequest("Use the yyyy-MM format, for example 2026-11.");

        var monthKey = first.Value.ToString("yyyy-MM");

        var tenants = await _db.Tenants
            .Include(t => t.Room)
            .Where(t => t.IsActive && t.RoomId != null)
            .ToListAsync();

        var alreadyBilled = await _db.Bills
            .Where(b => !b.IsDeleted && b.Month == monthKey && b.Type == BillType.Rent)
            .Select(b => b.TenantId)
            .ToListAsync();

        var created = new List<Bill>();

        foreach (var t in tenants)
        {
            if (t.Room is null) continue;
            if (alreadyBilled.Contains(t.Id)) continue;   // avoid duplicates
            if (t.LeaseStart >= first.Value) continue;    // moved in this month: the first month is paid at move-in, so no bill yet

            var day = Math.Min(t.LeaseStart.Day, DateTime.DaysInMonth(first.Value.Year, first.Value.Month));

            created.Add(new Bill
            {
                TenantId = t.Id,
                RoomNo = t.Room.RoomNo,
                Type = BillType.Rent,
                Month = monthKey,
                Amount = t.Room.MonthlyRate,
                DueDate = new DateOnly(first.Value.Year, first.Value.Month, day),
                Status = BillStatus.Pending
            });
        }

        _db.Bills.AddRange(created);
        await _db.SaveChangesAsync();
        await RefreshOverdue();

        return Ok(new { month = monthKey, created = created.Count });
    }

    // POST /api/bills/1/pay
    [HttpPost("{id}/pay")]
    public async Task<IActionResult> Pay(int id)
    {
        var bill = await _db.Bills.FindAsync(id);
        if (bill is null || bill.IsDeleted) return NotFound();
        if (bill.Status == BillStatus.Paid) return Conflict("This bill is already paid.");

        bill.Status = BillStatus.Paid;
        bill.PaidOn = DateOnly.FromDateTime(DateTime.Today);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/bills/1 — soft delete: the bill goes to the Recycle Bin in Settings,
    // where it can be restored or deleted forever. Any status can be deleted now,
    // including Paid bills (history cleanup).
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var bill = await _db.Bills.FindAsync(id);
        if (bill is null || bill.IsDeleted) return NotFound();

        bill.IsDeleted = true;
        bill.DeletedOn = DateOnly.FromDateTime(DateTime.Today);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/bills/deleted — the Recycle Bin.
    [HttpGet("deleted")]
    public async Task<ActionResult<List<Bill>>> GetDeleted()
    {
        return await _db.Bills
            .Include(b => b.Tenant)
            .Where(b => b.IsDeleted)
            .OrderByDescending(b => b.DeletedOn)
            .ThenByDescending(b => b.Id)
            .ToListAsync();
    }

    // POST /api/bills/1/restore — bring a bill back from the Recycle Bin.
    [HttpPost("{id}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var bill = await _db.Bills.FindAsync(id);
        if (bill is null) return NotFound();
        if (!bill.IsDeleted) return Conflict("This bill is not deleted.");

        // A new bill of the same type/month may have been created since
        // this one was deleted (e.g. by Generate) — restoring would break
        // the unique index, so refuse with a plain message instead of a 500.
        var duplicate = await _db.Bills.AnyAsync(b =>
            !b.IsDeleted && b.TenantId == bill.TenantId && b.Month == bill.Month && b.Type == bill.Type);
        if (duplicate)
            return Conflict($"This tenant already has a {bill.Type} bill for {bill.Month}.");

        bill.IsDeleted = false;
        bill.DeletedOn = null;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/bills/1/permanent — delete forever from the Recycle Bin.
    [HttpDelete("{id}/permanent")]
    public async Task<IActionResult> DeletePermanent(int id)
    {
        var bill = await _db.Bills.FindAsync(id);
        if (bill is null) return NotFound();
        if (!bill.IsDeleted) return Conflict("Delete the bill first so it goes to the Recycle Bin.");

        _db.Bills.Remove(bill);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Pending bills past their due date -> Overdue
    private async Task RefreshOverdue()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var late = await _db.Bills
            .Where(b => !b.IsDeleted && b.Status == BillStatus.Pending && b.DueDate < today)
            .ToListAsync();

        foreach (var bill in late) bill.Status = BillStatus.Overdue;
        if (late.Count > 0) await _db.SaveChangesAsync();
    }

    private static DateOnly? ParseMonth(string? month)
    {
        if (string.IsNullOrWhiteSpace(month))
        {
            var today = DateTime.Today;
            return new DateOnly(today.Year, today.Month, 1);
        }

        return DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", out var date) ? date : null;
    }
}

public record CreateBillRequest(
    int TenantId,
    BillType Type,
    string Month,
    decimal Amount,
    DateOnly DueDate,
    string? Note);
