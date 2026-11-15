using System.Net;
using System.Text.Json;

namespace BoardingHouse.Api.Tests;

public class BillsTests : ApiTestBase
{
    private async Task<int> SetupTenantAsync(string name = "Juan Dela Cruz", string contact = "09170000001")
    {
        var roomId = await CreateRoomAsync("101");
        return await CreateTenantAsync(name, contact, roomId);
    }

    [Fact]
    public async Task Generate_creates_a_rent_bill_for_the_active_tenant()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();

        // Bill for next month: its due date (the lease-start day, the 1st)
        // is still in the future, so the bill stays Pending instead of
        // flipping to Overdue when the list is read back.
        var month = DateOnly.FromDateTime(DateTime.Today).AddMonths(1).ToString("yyyy-MM");

        var (status, body) = await PostJsonAsync($"/api/bills/generate?month={month}", new { });
        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(1, JsonDocument.Parse(body).RootElement.GetProperty("created").GetInt32());

        var (_, billsBody) = await GetAsync($"/api/bills?month={month}");
        var bills = JsonDocument.Parse(billsBody).RootElement;
        Assert.Single(bills.EnumerateArray());
        var bill = bills[0];
        Assert.Equal(tenantId, bill.GetProperty("tenantId").GetInt32());
        Assert.Equal("Rent", bill.GetProperty("type").GetString());
        Assert.Equal("Pending", bill.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Generate_twice_in_the_same_month_creates_nothing_new()
    {
        await AuthorizeAsync();
        await SetupTenantAsync();

        var (_, first) = await PostJsonAsync("/api/bills/generate?month=2026-10", new { });
        Assert.Equal(1, JsonDocument.Parse(first).RootElement.GetProperty("created").GetInt32());

        var (status, second) = await PostJsonAsync("/api/bills/generate?month=2026-10", new { });
        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(0, JsonDocument.Parse(second).RootElement.GetProperty("created").GetInt32());
    }

    [Fact]
    public async Task Manual_duplicate_bill_is_blocked()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        await CreateBillAsync(tenantId, "Electricity", "2026-11", 850, "2026-11-15");

        var (status, body) = await PostJsonAsync("/api/bills",
            new { tenantId, type = "Electricity", month = "2026-11", amount = 900, dueDate = "2026-11-15", note = (string?)null });
        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Contains("already has a Electricity bill for 2026-11", body);
    }

    [Fact]
    public async Task Pay_bill_marks_it_paid_and_paying_again_is_blocked()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var billId = await CreateBillAsync(tenantId, "Rent", "2026-11", 3500, "2026-11-01");

        var (payStatus, _) = await PostJsonAsync($"/api/bills/{billId}/pay", new { });
        Assert.Equal(HttpStatusCode.NoContent, payStatus);

        var (_, body) = await GetAsync("/api/bills?month=2026-11");
        var bill = JsonDocument.Parse(body).RootElement[0];
        Assert.Equal("Paid", bill.GetProperty("status").GetString());
        Assert.False(string.IsNullOrEmpty(bill.GetProperty("paidOn").GetString()));

        var (againStatus, againBody) = await PostJsonAsync($"/api/bills/{billId}/pay", new { });
        Assert.Equal(HttpStatusCode.Conflict, againStatus);
        Assert.Contains("already paid", againBody);
    }

    [Fact]
    public async Task Delete_unpaid_bill_succeeds()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var billId = await CreateBillAsync(tenantId, "Electricity", "2026-11", 850, "2026-11-15");

        var (status, _) = await DeleteAsync($"/api/bills/{billId}");
        Assert.Equal(HttpStatusCode.NoContent, status);

        var (_, body) = await GetAsync("/api/bills");
        var remaining = JsonDocument.Parse(body).RootElement.EnumerateArray();
        Assert.DoesNotContain(remaining, b => b.GetProperty("id").GetInt32() == billId);
    }

    [Fact]
    public async Task Delete_paid_bill_is_blocked()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var billId = await CreateBillAsync(tenantId, "Rent", "2026-11", 3500, "2026-11-01");
        await PostJsonAsync($"/api/bills/{billId}/pay", new { });

        var (status, body) = await DeleteAsync($"/api/bills/{billId}");
        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Contains("Paid bills cannot be deleted", body);
    }

    [Fact]
    public async Task Delete_missing_bill_returns_404()
    {
        await AuthorizeAsync();
        var (status, _) = await DeleteAsync("/api/bills/999");
        Assert.Equal(HttpStatusCode.NotFound, status);
    }

    [Fact]
    public async Task Past_due_bill_becomes_Overdue()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        await CreateBillAsync(tenantId, "Electricity", "2026-01", 850, "2026-01-15");

        var (_, body) = await GetAsync("/api/bills?month=2026-01");
        var bill = JsonDocument.Parse(body).RootElement[0];
        Assert.Equal("Overdue", bill.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Create_bill_validation_returns_400()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();

        var (zeroAmount, _) = await PostJsonAsync("/api/bills",
            new { tenantId, type = "Electricity", month = "2026-11", amount = 0, dueDate = "2026-11-15", note = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, zeroAmount);

        var (badMonth, _) = await PostJsonAsync("/api/bills",
            new { tenantId, type = "Electricity", month = "11-2026", amount = 850, dueDate = "2026-11-15", note = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, badMonth);
    }
}
