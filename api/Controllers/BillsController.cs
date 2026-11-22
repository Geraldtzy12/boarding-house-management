using BoardingHouse.Api.Data;
using BoardingHouse.Api.Models;
using BoardingHouse.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardingHouse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BillsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly BillEvents _events;

    public BillsController(AppDbContext db, BillEvents events)
    {
        _db = db;
        _events = events;
    }

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
        _events.Raise(new BillChangedEventArgs
        {
            BillId = bill.Id, Action = "Created",
            TenantName = tenant.Name, Amount = bill.Amount
        });

        return Ok(bill);
    }

    // PUT /api/bills/1 — edit a bill that is not paid yet (type, month,
    // amount, due date, note). A paid bill is history and cannot be edited.
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateBillRequest request)
    {
        var bill = await _db.Bills.Include(b => b.Tenant).FirstOrDefaultAsync(b => b.Id == id);
        if (bill is null || bill.IsDeleted) return NotFound();
        if (bill.Status == BillStatus.Paid) return Conflict("This bill is already paid.");

        if (request.Amount <= 0)
            return BadRequest("The amount must be greater than 0.");
        if (request.Amount < bill.PaidAmount)
            return BadRequest($"The amount cannot be less than the {bill.PaidAmount} already paid.");
        if (string.IsNullOrWhiteSpace(request.Month) || ParseMonth(request.Month) is null)
            return BadRequest("Use the yyyy-MM format, for example 2026-11.");

        var duplicate = await _db.Bills.AnyAsync(b =>
            !b.IsDeleted && b.Id != id && b.TenantId == bill.TenantId && b.Month == request.Month && b.Type == request.Type);
        if (duplicate)
            return Conflict($"{bill.Tenant?.Name ?? "This tenant"} already has a {request.Type} bill for {request.Month}.");

        bill.Type = request.Type;
        bill.Month = request.Month;
        bill.Amount = request.Amount;
        bill.DueDate = request.DueDate;
        bill.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();

        // A due date moved to the future un-overdues the bill.
        if (bill.Status == BillStatus.Overdue && bill.DueDate >= DateOnly.FromDateTime(DateTime.Today))
            bill.Status = BillStatus.Pending;

        await _db.SaveChangesAsync();
        _events.Raise(new BillChangedEventArgs
        {
            BillId = id, Action = "Updated",
            TenantName = bill.Tenant?.Name ?? "", Amount = bill.Amount
        });
        return NoContent();
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
        if (created.Count > 0)
            _events.Raise(new BillChangedEventArgs
            {
                BillId = 0, Action = "Generated",
                TenantName = "", Amount = 0, Count = created.Count
            });

        return Ok(new { month = monthKey, created = created.Count });
    }

    // POST /api/bills/1/pay — full pay when no amount is sent, or a partial
    // payment when one is: { "amount": 1500 }. A partial payment adds to
    // PaidAmount and leaves the bill Pending/Overdue; paying the rest (or
    // more) marks it Paid like before.
    [HttpPost("{id}/pay")]
    public async Task<IActionResult> Pay(int id, PayBillRequest? request)
    {
        var bill = await _db.Bills.Include(b => b.Tenant).FirstOrDefaultAsync(b => b.Id == id);
        if (bill is null || bill.IsDeleted) return NotFound();
        if (bill.Status == BillStatus.Paid) return Conflict("This bill is already paid.");

        var remaining = bill.Amount - bill.PaidAmount;

        if (request?.Amount is not null)
        {
            if (request.Amount <= 0)
                return BadRequest("The payment must be greater than 0.");

            if (request.Amount < remaining)
            {
                bill.PaidAmount += request.Amount.Value;
                await _db.SaveChangesAsync();
                _events.Raise(new BillChangedEventArgs
                {
                    BillId = id, Action = "Paid",
                    TenantName = bill.Tenant?.Name ?? "", Amount = request.Amount.Value
                });
                return NoContent();
            }
            // amount >= remaining: fall through to a full pay below.
        }

        bill.PaidAmount = bill.Amount;
        bill.Status = BillStatus.Paid;
        bill.PaidOn = DateOnly.FromDateTime(DateTime.Today);
        await _db.SaveChangesAsync();
        _events.Raise(new BillChangedEventArgs
        {
            BillId = id, Action = "Paid",
            TenantName = bill.Tenant?.Name ?? "", Amount = remaining
        });
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
        _events.Raise(new BillChangedEventArgs
        {
            BillId = id, Action = "Deleted",
            TenantName = "", Amount = bill.Amount
        });
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
        _events.Raise(new BillChangedEventArgs
        {
            BillId = id, Action = "Restored",
            TenantName = "", Amount = bill.Amount
        });
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
        _events.Raise(new BillChangedEventArgs
        {
            BillId = id, Action = "DeletedForever",
            TenantName = "", Amount = bill.Amount
        });
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

public record UpdateBillRequest(
    BillType Type,
    string Month,
    decimal Amount,
    DateOnly DueDate,
    string? Note);

public record PayBillRequest(decimal? Amount);
