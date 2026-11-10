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

        var query = _db.Bills.Include(b => b.Tenant).AsQueryable();

        if (Enum.TryParse<BillStatus>(status, true, out var parsed))
            query = query.Where(b => b.Status == parsed);

        if (!string.IsNullOrWhiteSpace(month))
            query = query.Where(b => b.Month == month);

        return await query
            .OrderByDescending(b => b.DueDate)
            .ThenBy(b => b.RoomNo)
            .ToListAsync();
    }

    // POST /api/bills  (manual: kuryente, tubig, rent, iba pa)
    [HttpPost]
    public async Task<IActionResult> Create(CreateBillRequest request)
    {
        if (request.Amount <= 0)
            return BadRequest("Dapat mas malaki sa 0 ang halaga.");

        if (string.IsNullOrWhiteSpace(request.Month) || ParseMonth(request.Month) is null)
            return BadRequest("Gamitin ang format na yyyy-MM, halimbawa 2026-11.");

        var tenant = await _db.Tenants
            .Include(t => t.Room)
            .FirstOrDefaultAsync(t => t.Id == request.TenantId);

        if (tenant is null || !tenant.IsActive || tenant.Room is null)
            return BadRequest("Pumili ng active na tenant na may room.");

        var exists = await _db.Bills.AnyAsync(b =>
            b.TenantId == request.TenantId && b.Month == request.Month && b.Type == request.Type);

        if (exists)
            return Conflict($"May {request.Type} bill na si {tenant.Name} para sa {request.Month}.");

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

    // POST /api/bills/generate?month=2026-11  (Rent lang; walang month = kasalukuyang buwan)
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromQuery] string? month)
    {
        var first = ParseMonth(month);
        if (first is null)
            return BadRequest("Gamitin ang format na yyyy-MM, halimbawa 2026-11.");

        var monthKey = first.Value.ToString("yyyy-MM");
        var lastDay = first.Value.AddMonths(1).AddDays(-1);

        var tenants = await _db.Tenants
            .Include(t => t.Room)
            .Where(t => t.IsActive && t.RoomId != null)
            .ToListAsync();

        var alreadyBilled = await _db.Bills
            .Where(b => b.Month == monthKey && b.Type == BillType.Rent)
            .Select(b => b.TenantId)
            .ToListAsync();

        var created = new List<Bill>();

        foreach (var t in tenants)
        {
            if (t.Room is null) continue;
            if (alreadyBilled.Contains(t.Id)) continue;   // iwas duplicate
            if (t.LeaseStart > lastDay) continue;         // hindi pa nagsisimula ang lease

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
        if (bill is null) return NotFound();
        if (bill.Status == BillStatus.Paid) return Conflict("Bayad na ang bill na ito.");

        bill.Status = BillStatus.Paid;
        bill.PaidOn = DateOnly.FromDateTime(DateTime.Today);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Pending na lumampas na ang due date -> Overdue
    private async Task RefreshOverdue()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var late = await _db.Bills
            .Where(b => b.Status == BillStatus.Pending && b.DueDate < today)
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