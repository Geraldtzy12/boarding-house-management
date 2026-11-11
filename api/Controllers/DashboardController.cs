using BoardingHouse.Api.Data;
using BoardingHouse.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardingHouse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db) => _db = db;

    // GET /api/dashboard — one summary for the Dashboard page.
    [HttpGet]
    public async Task<ActionResult<DashboardSummary>> Get()
    {
        await RefreshOverdue();

        var today = DateOnly.FromDateTime(DateTime.Today);

        var rooms = await _db.Rooms.ToListAsync();
        var bills = await _db.Bills.Include(b => b.Tenant).ToListAsync();

        var paidThisMonth = bills.Where(b =>
            b.Status == BillStatus.Paid &&
            b.PaidOn is not null &&
            b.PaidOn.Value.Year == today.Year &&
            b.PaidOn.Value.Month == today.Month);

        var overdue = bills
            .Where(b => b.Status == BillStatus.Overdue)
            .OrderBy(b => b.DueDate)
            .ToList();

        return new DashboardSummary(
            TotalRooms: rooms.Count,
            OccupiedRooms: rooms.Count(r => r.Status == RoomStatus.Occupied),
            VacantRooms: rooms.Count(r => r.Status == RoomStatus.Vacant),
            ActiveTenants: await _db.Tenants.CountAsync(t => t.IsActive),
            CollectedThisMonth: paidThisMonth.Sum(b => b.Amount),
            ToCollect: bills.Where(b => b.Status != BillStatus.Paid).Sum(b => b.Amount),
            OverdueCount: overdue.Count,
            OverdueAmount: overdue.Sum(b => b.Amount),
            OverdueBills: overdue.Take(5).Select(b => new OverdueBill(
                b.Id, b.Tenant?.Name ?? "—", b.RoomNo, b.Type.ToString(), b.Amount, b.DueDate)).ToList(),
            VacantRoomList: rooms
                .Where(r => r.Status == RoomStatus.Vacant)
                .OrderBy(r => r.RoomNo)
                .Select(r => new VacantRoom(r.Id, r.RoomNo, r.MonthlyRate, r.Capacity)).ToList(),
            RecentPayments: bills
                .Where(b => b.Status == BillStatus.Paid && b.PaidOn is not null)
                .OrderByDescending(b => b.PaidOn)
                .Take(5)
                .Select(b => new RecentPayment(
                    b.Id, b.Tenant?.Name ?? "—", b.RoomNo, b.Type.ToString(), b.Amount, b.PaidOn!.Value)).ToList()
        );
    }

    // Pending bills past their due date -> Overdue (same rule as BillsController).
    private async Task RefreshOverdue()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var late = await _db.Bills
            .Where(b => b.Status == BillStatus.Pending && b.DueDate < today)
            .ToListAsync();

        foreach (var bill in late) bill.Status = BillStatus.Overdue;
        if (late.Count > 0) await _db.SaveChangesAsync();
    }

    // GET /api/dashboard/monthly — collected totals for the last 6 months (incl. current).
    [HttpGet("monthly")]
    public async Task<ActionResult<List<MonthlyCollection>>> GetMonthly()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var firstOfMonth = new DateOnly(today.Year, today.Month, 1);
        var months = Enumerable.Range(0, 6)
            .Select(i => firstOfMonth.AddMonths(-5 + i))
            .ToList();

        var paid = await _db.Bills
            .Where(b => b.Status == BillStatus.Paid && b.PaidOn != null)
            .Select(b => new { b.PaidOn!.Value.Year, b.PaidOn!.Value.Month, b.Amount })
            .ToListAsync();

        return months.Select(m => new MonthlyCollection(
            $"{m.Year:D4}-{m.Month:D2}",
            paid.Where(p => p.Year == m.Year && p.Month == m.Month).Sum(p => p.Amount)
        )).ToList();
    }
}

public record DashboardSummary(
    int TotalRooms,
    int OccupiedRooms,
    int VacantRooms,
    int ActiveTenants,
    decimal CollectedThisMonth,
    decimal ToCollect,
    int OverdueCount,
    decimal OverdueAmount,
    List<OverdueBill> OverdueBills,
    List<VacantRoom> VacantRoomList,
    List<RecentPayment> RecentPayments);

public record OverdueBill(int Id, string TenantName, string RoomNo, string Type, decimal Amount, DateOnly DueDate);

public record VacantRoom(int Id, string RoomNo, decimal MonthlyRate, int Capacity);

public record RecentPayment(int Id, string TenantName, string RoomNo, string Type, decimal Amount, DateOnly PaidOn);

public record MonthlyCollection(string Month, decimal Collected);
