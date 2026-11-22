using System.Net;
using System.Text;

namespace BoardingHouse.Api.Tests;

public class BackupTests : ApiTestBase
{
    [Fact]
    public async Task DownloadDatabase_WithoutToken_Returns401()
    {
        using var response = await Client.GetAsync("/api/backup/database");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DownloadDatabase_ReturnsValidSqliteFile()
    {
        await AuthorizeAsync();
        using var response = await Client.GetAsync("/api/backup/database");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/x-sqlite3", response.Content.Headers.ContentType?.MediaType);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0);
        Assert.Equal("SQLite format 3", Encoding.ASCII.GetString(bytes, 0, 15));
        var disposition = response.Content.Headers.TryGetValues("Content-Disposition", out var values)
            ? string.Join(";", values)
            : "";
        Assert.Contains("boardinghouse-backup", disposition);
        Assert.Contains(".db", disposition);
    }

    [Fact]
    public async Task ExportBills_WithoutToken_Returns401()
    {
        using var response = await Client.GetAsync("/api/backup/bills.csv");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ExportBills_ReturnsCsvWithBillRow()
    {
        await AuthorizeAsync();
        var roomId = await CreateRoomAsync("01", 3000, 1);
        var tenantId = await CreateTenantAsync("Kim Matibay", "09171234567", roomId);
        await CreateBillAsync(tenantId, "Rent", "2026-12", 3000, "2026-12-18");

        using var response = await Client.GetAsync("/api/backup/bills.csv");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        var csv = await response.Content.ReadAsStringAsync();
        Assert.StartsWith("Tenant,Room,Type,Month,Amount,Paid Amount,Due Date,Status,Paid On,Note", csv);
        Assert.Contains("Kim Matibay", csv);
        Assert.Contains("3000.00", csv);
        Assert.Contains("2026-12", csv);
    }

    [Fact]
    public async Task ExportBills_ExcludesDeletedBills()
    {
        await AuthorizeAsync();
        var roomId = await CreateRoomAsync("01", 3000, 1);
        var tenantId = await CreateTenantAsync("Temp Export", "09171234567", roomId);
        var billId = await CreateBillAsync(tenantId, "Rent", "2026-12", 3000, "2026-12-18");
        var (deleteStatus, _) = await DeleteAsync($"/api/bills/{billId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteStatus);

        using var response = await Client.GetAsync("/api/backup/bills.csv");
        var csv = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Temp Export", csv);
    }

    [Fact]
    public async Task ExportTenants_ReturnsCsvWithTenantRow()
    {
        await AuthorizeAsync();
        var roomId = await CreateRoomAsync("01", 3000, 1);
        await CreateTenantAsync("Kim Matibay", "09171234567", roomId);

        using var response = await Client.GetAsync("/api/backup/tenants.csv");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        var csv = await response.Content.ReadAsStringAsync();
        Assert.StartsWith("Name,Contact,Room,Lease Start,Status", csv);
        Assert.Contains("Kim Matibay", csv);
        Assert.Contains("09171234567", csv);
        Assert.Contains("Active", csv);
    }
}
