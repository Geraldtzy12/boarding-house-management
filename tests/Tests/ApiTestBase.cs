using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace BoardingHouse.Api.Tests;

/// <summary>
/// One fresh API (fresh empty database) per test, with helpers for
/// logging in and creating rooms / tenants / bills.
/// </summary>
public abstract class ApiTestBase : IDisposable
{
    protected readonly ApiTestFactory Factory;
    protected readonly HttpClient Client;

    protected ApiTestBase()
    {
        Factory = new ApiTestFactory();
        Client = Factory.CreateClient();
    }

    public void Dispose()
    {
        Client.Dispose();
        Factory.Dispose();
    }

    protected async Task<(HttpStatusCode Status, string Body)> GetAsync(string url)
    {
        using var response = await Client.GetAsync(url);
        return (response.StatusCode, await response.Content.ReadAsStringAsync());
    }

    protected async Task<(HttpStatusCode Status, string Body)> PostJsonAsync(string url, object payload)
    {
        using var response = await Client.PostAsJsonAsync(url, payload);
        return (response.StatusCode, await response.Content.ReadAsStringAsync());
    }

    protected async Task<(HttpStatusCode Status, string Body)> PutJsonAsync(string url, object payload)
    {
        using var response = await Client.PutAsJsonAsync(url, payload);
        return (response.StatusCode, await response.Content.ReadAsStringAsync());
    }

    protected async Task<(HttpStatusCode Status, string Body)> DeleteAsync(string url)
    {
        using var response = await Client.DeleteAsync(url);
        return (response.StatusCode, await response.Content.ReadAsStringAsync());
    }

    protected async Task<string> AuthorizeAsync(string username = "admin", string password = "test1234")
    {
        var (status, body) = await PostJsonAsync("/api/auth/login", new { username, password });
        Assert.Equal(HttpStatusCode.OK, status);
        var token = JsonDocument.Parse(body).RootElement.GetProperty("token").GetString();
        Assert.False(string.IsNullOrEmpty(token));
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return token!;
    }

    protected async Task<int> CreateRoomAsync(string roomNo, decimal monthlyRate = 3000, int capacity = 1)
    {
        var (status, body) = await PostJsonAsync("/api/rooms",
            new { roomNo, monthlyRate, capacity, status = "Vacant" });
        Assert.Equal(HttpStatusCode.Created, status);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetInt32();
    }

    protected async Task<int> CreateTenantAsync(string name, string contact, int? roomId)
    {
        var (status, body) = await PostJsonAsync("/api/tenants",
            new { name, contact, roomId, leaseStart = "2026-10-01", isActive = true });
        Assert.Equal(HttpStatusCode.Created, status);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetInt32();
    }

    protected async Task<int> CreateBillAsync(int tenantId, string type, string month, decimal amount, string dueDate)
    {
        var (status, body) = await PostJsonAsync("/api/bills",
            new { tenantId, type, month, amount, dueDate, note = (string?)null });
        Assert.Equal(HttpStatusCode.OK, status);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetInt32();
    }
}
