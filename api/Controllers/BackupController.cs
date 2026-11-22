using System.Globalization;
using System.Text;
using BoardingHouse.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardingHouse.Api.Controllers;

/// <summary>
/// Backup & Export (Settings page): download a copy of the whole
/// SQLite database, or export bills / tenants as CSV files that open
/// in Excel or WPS Office.
/// </summary>
[ApiController]
[Route("api/backup")]
public class BackupController : ControllerBase
{
    private readonly AppDbContext _db;

    public BackupController(AppDbContext db) => _db = db;

    // GET /api/backup/database — the whole database as one .db file.
    [HttpGet("database")]
    public async Task<IActionResult> DownloadDatabase()
    {
        // VACUUM INTO copies the live database into a new file while the
        // API keeps running. It cannot run inside a transaction, so this
        // runs on its own — no SaveChanges, no explicit transaction.
        var tempPath = Path.Combine(Path.GetTempPath(), $"boardinghouse-backup-{Guid.NewGuid():N}.db");
        try
        {
            var escaped = tempPath.Replace("'", "''");
            _db.Database.ExecuteSqlRaw($"VACUUM INTO '{escaped}'");
            var bytes = await System.IO.File.ReadAllBytesAsync(tempPath);
            var fileName = $"boardinghouse-backup-{DateTime.Now:yyyy-MM-dd}.db";
            return File(bytes, "application/x-sqlite3", fileName);
        }
        catch (Exception)
        {
            return StatusCode(500, "Could not create the database backup. Try again.");
        }
        finally
        {
            if (System.IO.File.Exists(tempPath))
                System.IO.File.Delete(tempPath);
        }
    }

    // GET /api/backup/bills.csv — every bill that is not in the Recycle Bin.
    [HttpGet("bills.csv")]
    public async Task<IActionResult> ExportBills()
    {
        var bills = await _db.Bills
            .Include(b => b.Tenant)
            .Where(b => !b.IsDeleted)
            .OrderByDescending(b => b.Month)
            .ThenBy(b => b.Tenant!.Name)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Tenant,Room,Type,Month,Amount,Paid Amount,Due Date,Status,Paid On,Note");
        foreach (var b in bills)
        {
            sb.AppendLine(string.Join(",", new[]
            {
                Csv(b.Tenant?.Name ?? ""),
                Csv(b.RoomNo),
                Csv(b.Type.ToString()),
                Csv(b.Month),
                b.Amount.ToString("0.00", CultureInfo.InvariantCulture),
                b.PaidAmount.ToString("0.00", CultureInfo.InvariantCulture),
                Csv(b.DueDate.ToString("yyyy-MM-dd")),
                Csv(b.Status.ToString()),
                Csv(b.PaidOn?.ToString("yyyy-MM-dd") ?? ""),
                Csv(b.Note ?? "")
            }));
        }
        return CsvFile(sb.ToString(), $"bills-{DateTime.Now:yyyy-MM-dd}.csv");
    }

    // GET /api/backup/tenants.csv — every tenant, active and moved out.
    [HttpGet("tenants.csv")]
    public async Task<IActionResult> ExportTenants()
    {
        var tenants = await _db.Tenants
            .Include(t => t.Room)
            .OrderBy(t => t.Name)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Name,Contact,Room,Lease Start,Status");
        foreach (var t in tenants)
        {
            sb.AppendLine(string.Join(",", new[]
            {
                Csv(t.Name),
                Csv(t.Contact),
                Csv(t.Room?.RoomNo ?? ""),
                Csv(t.LeaseStart.ToString("yyyy-MM-dd")),
                Csv(t.IsActive ? "Active" : "Moved out")
            }));
        }
        return CsvFile(sb.ToString(), $"tenants-{DateTime.Now:yyyy-MM-dd}.csv");
    }

    private FileContentResult CsvFile(string csv, string fileName) =>
        File(Encoding.UTF8.GetBytes(csv), "text/csv", fileName);

    // One CSV rule: a field with a comma, quote, or line break is wrapped
    // in quotes, and quotes inside it are doubled.
    private static string Csv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        return value;
    }
}
