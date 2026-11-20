using System.Net;
using System.Text.Json;

namespace BoardingHouse.Api.Tests;

/// <summary>
/// Collected this month counts paid bills FOR the current month (the bill's
/// Month), not by the date the payment was made: a December rent bill paid
/// in November belongs to December's total, same as the History page.
/// </summary>
public class DashboardTests : ApiTestBase
{
    [Fact]
    public async Task Collected_this_month_counts_only_bills_for_this_month()
    {
        await AuthorizeAsync();
        var roomId = await CreateRoomAsync("101", 5000, 2);
        var tenantId = await CreateTenantAsync("Juan Dela Cruz", "09170000001", roomId);

        var today = DateOnly.FromDateTime(DateTime.Today);
        var thisMonth = today.ToString("yyyy-MM");
        var nextMonth = today.AddMonths(1).ToString("yyyy-MM");
        // Due dates in the future so RefreshOverdue does not flip them first.
        var dueThisMonth = today.AddDays(5).ToString("yyyy-MM-dd");
        var dueNextMonth = today.AddMonths(1).AddDays(5).ToString("yyyy-MM-dd");

        // A bill FOR this month (Water, like the real November data).
        var waterId = await CreateBillAsync(tenantId, "Water", thisMonth, 150, dueThisMonth);
        // A rent bill FOR next month — the December case.
        var rentId = await CreateBillAsync(tenantId, "Rent", nextMonth, 5000, dueNextMonth);

        // Both are paid today (November): all the money came in this month.
        var (payWaterStatus, _) = await PostJsonAsync($"/api/bills/{waterId}/pay", new { });
        Assert.Equal(HttpStatusCode.NoContent, payWaterStatus);
        var (payRentStatus, _) = await PostJsonAsync($"/api/bills/{rentId}/pay", new { });
        Assert.Equal(HttpStatusCode.NoContent, payRentStatus);

        var (status, body) = await GetAsync("/api/dashboard");
        Assert.Equal(HttpStatusCode.OK, status);
        var collected = JsonDocument.Parse(body).RootElement.GetProperty("collectedThisMonth").GetDecimal();

        // Only the bill FOR this month counts — the next month's rent does not,
        // even though it was paid today.
        Assert.Equal(150, collected);
    }
}
