using System.Net;
using System.Text.Json;

namespace BoardingHouse.Api.Tests;

public class BillsTests : ApiTestBase
{
    private async Task<int> SetupTenantAsync(string name = "Juan Dela Cruz", string contact = "09170000001")
    {
        var roomId = await CreateRoomAsync("101", 2500, 2);
        return await CreateTenantAsync(name, contact, roomId);
    }

    private static List<int> BillIds(string body) =>
        JsonDocument.Parse(body).RootElement.EnumerateArray()
            .Select(b => b.GetProperty("id").GetInt32()).ToList();

    [Fact]
    public async Task Generate_creates_a_rent_bill_for_the_active_tenant()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
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
        var month = DateOnly.FromDateTime(DateTime.Today).AddMonths(1).ToString("yyyy-MM");

        var (_, first) = await PostJsonAsync($"/api/bills/generate?month={month}", new { });
        Assert.Equal(1, JsonDocument.Parse(first).RootElement.GetProperty("created").GetInt32());

        var (status, second) = await PostJsonAsync($"/api/bills/generate?month={month}", new { });
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
    public async Task Delete_paid_bill_moves_it_to_the_recycle_bin()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var billId = await CreateBillAsync(tenantId, "Rent", "2026-11", 3500, "2026-11-01");
        await PostJsonAsync($"/api/bills/{billId}/pay", new { });

        var (status, _) = await DeleteAsync($"/api/bills/{billId}");
        Assert.Equal(HttpStatusCode.NoContent, status);

        var (_, billsBody) = await GetAsync("/api/bills");
        Assert.DoesNotContain(BillIds(billsBody), id => id == billId);

        var (_, deletedBody) = await GetAsync("/api/bills/deleted");
        Assert.Contains(BillIds(deletedBody), id => id == billId);
    }

    [Fact]
    public async Task Restore_brings_a_deleted_bill_back()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var billId = await CreateBillAsync(tenantId, "Electricity", "2026-11", 850, "2026-11-15");
        await DeleteAsync($"/api/bills/{billId}");

        var (status, _) = await PostJsonAsync($"/api/bills/{billId}/restore", new { });
        Assert.Equal(HttpStatusCode.NoContent, status);

        var (_, billsBody) = await GetAsync("/api/bills");
        Assert.Contains(BillIds(billsBody), id => id == billId);

        var (_, deletedBody) = await GetAsync("/api/bills/deleted");
        Assert.DoesNotContain(BillIds(deletedBody), id => id == billId);
    }

    [Fact]
    public async Task Recreate_after_delete_is_blocked_with_409()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var billId = await CreateBillAsync(tenantId, "Electricity", "2026-11", 850, "2026-11-15");
        await DeleteAsync($"/api/bills/{billId}");

        // A new bill for the same tenant, type and month is blocked: the
        // deleted bill still owns that month, so it must be restored (or
        // deleted forever) first — otherwise the tenant could be billed
        // twice for one month, even after already paying.
        var (status, body) = await PostJsonAsync("/api/bills",
            new { tenantId, type = "Electricity", month = "2026-11", amount = 900, dueDate = "2026-11-15", note = (string?)null });
        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Contains("already has a Electricity bill for 2026-11", body);

        // The old bill stays in the Recycle Bin, and restoring it still works.
        var (_, deletedBody) = await GetAsync("/api/bills/deleted");
        Assert.Contains(BillIds(deletedBody), id => id == billId);

        var (restoreStatus, _) = await PostJsonAsync($"/api/bills/{billId}/restore", new { });
        Assert.Equal(HttpStatusCode.NoContent, restoreStatus);
    }

    [Fact]
    public async Task Delete_forever_removes_a_bill_from_the_recycle_bin()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var billId = await CreateBillAsync(tenantId, "Electricity", "2026-11", 850, "2026-11-15");
        await DeleteAsync($"/api/bills/{billId}");

        var (status, _) = await DeleteAsync($"/api/bills/{billId}/permanent");
        Assert.Equal(HttpStatusCode.NoContent, status);

        var (_, deletedBody) = await GetAsync("/api/bills/deleted");
        Assert.DoesNotContain(BillIds(deletedBody), id => id == billId);
    }

    [Fact]
    public async Task Recreate_after_delete_forever_is_allowed()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var billId = await CreateBillAsync(tenantId, "Electricity", "2026-11", 850, "2026-11-15");
        await DeleteAsync($"/api/bills/{billId}");
        await DeleteAsync($"/api/bills/{billId}/permanent");

        // Once the deleted bill is gone for good, the month is free again.
        var (status, _) = await PostJsonAsync("/api/bills",
            new { tenantId, type = "Electricity", month = "2026-11", amount = 900, dueDate = "2026-11-15", note = (string?)null });
        Assert.Equal(HttpStatusCode.OK, status);
    }

    [Fact]
    public async Task Generate_after_delete_creates_nothing_new()
    {
        await AuthorizeAsync();
        await SetupTenantAsync();
        var month = DateOnly.FromDateTime(DateTime.Today).AddMonths(1).ToString("yyyy-MM");

        var (_, first) = await PostJsonAsync($"/api/bills/generate?month={month}", new { });
        Assert.Equal(1, JsonDocument.Parse(first).RootElement.GetProperty("created").GetInt32());

        var (_, billsBody) = await GetAsync($"/api/bills?month={month}");
        var billId = JsonDocument.Parse(billsBody).RootElement[0].GetProperty("id").GetInt32();
        await DeleteAsync($"/api/bills/{billId}");

        // The deleted rent bill still owns the month: Generate skips the
        // tenant instead of billing the same month twice.
        var (status, second) = await PostJsonAsync($"/api/bills/generate?month={month}", new { });
        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(0, JsonDocument.Parse(second).RootElement.GetProperty("created").GetInt32());
    }

    [Fact]
    public async Task Generate_skips_the_move_in_month_and_bills_from_the_next_month()
    {
        await AuthorizeAsync();
        var roomId = await CreateRoomAsync("101", 2500, 2);
        var (createStatus, _) = await PostJsonAsync("/api/tenants",
            new { name = "Juan Dela Cruz", contact = "09170000001", roomId, leaseStart = "2026-11-18", isActive = true });
        Assert.Equal(HttpStatusCode.Created, createStatus);

        // Moved in on Nov 18, first month already paid at move-in: no November bill.
        var (_, november) = await PostJsonAsync("/api/bills/generate?month=2026-11", new { });
        Assert.Equal(0, JsonDocument.Parse(november).RootElement.GetProperty("created").GetInt32());

        // First bill comes with December.
        var (status, december) = await PostJsonAsync("/api/bills/generate?month=2026-12", new { });
        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(1, JsonDocument.Parse(december).RootElement.GetProperty("created").GetInt32());

        var (_, billsBody) = await GetAsync("/api/bills?month=2026-12");
        var bill = JsonDocument.Parse(billsBody).RootElement[0];
        Assert.Equal("Rent", bill.GetProperty("type").GetString());
        Assert.Equal(2500, bill.GetProperty("amount").GetDecimal());
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
            new { tenantId, type = "Electricity", month = "11-2026", amount = 0, dueDate = "2026-11-15", note = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, zeroAmount);

        var (badMonth, _) = await PostJsonAsync("/api/bills",
            new { tenantId, type = "Electricity", month = "11-2026", amount = 850, dueDate = "2026-11-15", note = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, badMonth);
    }

    [Fact]
    public async Task Edit_pending_bill_changes_amount_due_date_and_note()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var billId = await CreateBillAsync(tenantId, "Electricity", "2026-11", 850, "2026-11-15");

        var (status, _) = await PutJsonAsync($"/api/bills/{billId}",
            new { type = "Electricity", month = "2026-11", amount = 900, dueDate = "2026-11-20", note = "Meter reading corrected" });
        Assert.Equal(HttpStatusCode.NoContent, status);

        var (_, body) = await GetAsync("/api/bills?month=2026-11");
        var bill = JsonDocument.Parse(body).RootElement[0];
        Assert.Equal(900, bill.GetProperty("amount").GetDecimal());
        Assert.Equal("2026-11-20", bill.GetProperty("dueDate").GetString());
        Assert.Equal("Meter reading corrected", bill.GetProperty("note").GetString());
    }

    [Fact]
    public async Task Edit_paid_bill_is_blocked()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var billId = await CreateBillAsync(tenantId, "Rent", "2026-11", 3500, "2026-11-01");
        await PostJsonAsync($"/api/bills/{billId}/pay", new { });

        var (status, body) = await PutJsonAsync($"/api/bills/{billId}",
            new { type = "Rent", month = "2026-11", amount = 3000, dueDate = "2026-11-01", note = (string?)null });
        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Contains("already paid", body);
    }

    [Fact]
    public async Task Edit_bill_to_duplicate_type_and_month_is_blocked()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        await CreateBillAsync(tenantId, "Electricity", "2026-11", 850, "2026-11-15");
        var waterId = await CreateBillAsync(tenantId, "Water", "2026-11", 150, "2026-11-15");

        var (status, body) = await PutJsonAsync($"/api/bills/{waterId}",
            new { type = "Electricity", month = "2026-11", amount = 150, dueDate = "2026-11-15", note = (string?)null });
        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Contains("already has a Electricity bill for 2026-11", body);
    }

    [Fact]
    public async Task Edit_amount_below_paid_amount_is_blocked()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var due = DateOnly.FromDateTime(DateTime.Today).AddDays(5).ToString("yyyy-MM-dd");
        var billId = await CreateBillAsync(tenantId, "Rent", "2026-11", 3000, due);
        await PostJsonAsync($"/api/bills/{billId}/pay", new { amount = 1500 });

        var (status, _) = await PutJsonAsync($"/api/bills/{billId}",
            new { type = "Rent", month = "2026-11", amount = 1000, dueDate = "2026-11-01", note = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, status);
    }

    [Fact]
    public async Task Edit_missing_bill_returns_404()
    {
        await AuthorizeAsync();
        var (status, _) = await PutJsonAsync("/api/bills/999",
            new { type = "Rent", month = "2026-11", amount = 3000, dueDate = "2026-11-01", note = (string?)null });
        Assert.Equal(HttpStatusCode.NotFound, status);
    }

    [Fact]
    public async Task Partial_pay_keeps_bill_pending_with_paid_amount()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        // Due date in the future so RefreshOverdue does not flip it first.
        var due = DateOnly.FromDateTime(DateTime.Today).AddDays(5).ToString("yyyy-MM-dd");
        var billId = await CreateBillAsync(tenantId, "Rent", "2026-11", 3000, due);

        var (status, _) = await PostJsonAsync($"/api/bills/{billId}/pay", new { amount = 1500 });
        Assert.Equal(HttpStatusCode.NoContent, status);

        var (_, body) = await GetAsync("/api/bills?month=2026-11");
        var bill = JsonDocument.Parse(body).RootElement[0];
        Assert.Equal("Pending", bill.GetProperty("status").GetString());
        Assert.Equal(1500, bill.GetProperty("paidAmount").GetDecimal());
        Assert.Null(bill.GetProperty("paidOn").GetString());
    }

    [Fact]
    public async Task Partial_pay_then_the_rest_marks_bill_paid()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var due = DateOnly.FromDateTime(DateTime.Today).AddDays(5).ToString("yyyy-MM-dd");
        var billId = await CreateBillAsync(tenantId, "Rent", "2026-11", 3000, due);

        await PostJsonAsync($"/api/bills/{billId}/pay", new { amount = 1500 });
        var (status, _) = await PostJsonAsync($"/api/bills/{billId}/pay", new { amount = 1500 });
        Assert.Equal(HttpStatusCode.NoContent, status);

        var (_, body) = await GetAsync("/api/bills?month=2026-11");
        var bill = JsonDocument.Parse(body).RootElement[0];
        Assert.Equal("Paid", bill.GetProperty("status").GetString());
        Assert.Equal(3000, bill.GetProperty("paidAmount").GetDecimal());
        Assert.False(string.IsNullOrEmpty(bill.GetProperty("paidOn").GetString()));
    }

    [Fact]
    public async Task Pay_more_than_remaining_marks_bill_paid()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var due = DateOnly.FromDateTime(DateTime.Today).AddDays(5).ToString("yyyy-MM-dd");
        var billId = await CreateBillAsync(tenantId, "Rent", "2026-11", 3000, due);

        var (status, _) = await PostJsonAsync($"/api/bills/{billId}/pay", new { amount = 5000 });
        Assert.Equal(HttpStatusCode.NoContent, status);

        var (_, body) = await GetAsync("/api/bills?month=2026-11");
        var bill = JsonDocument.Parse(body).RootElement[0];
        Assert.Equal("Paid", bill.GetProperty("status").GetString());
        Assert.Equal(3000, bill.GetProperty("paidAmount").GetDecimal());
    }

    [Fact]
    public async Task Pay_zero_or_negative_amount_is_blocked()
    {
        await AuthorizeAsync();
        var tenantId = await SetupTenantAsync();
        var billId = await CreateBillAsync(tenantId, "Rent", "2026-11", 3000, "2026-11-01");

        var (zeroStatus, _) = await PostJsonAsync($"/api/bills/{billId}/pay", new { amount = 0 });
        Assert.Equal(HttpStatusCode.BadRequest, zeroStatus);

        var (negativeStatus, _) = await PostJsonAsync($"/api/bills/{billId}/pay", new { amount = -100 });
        Assert.Equal(HttpStatusCode.BadRequest, negativeStatus);
    }
}