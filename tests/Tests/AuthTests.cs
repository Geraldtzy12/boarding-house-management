using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace BoardingHouse.Api.Tests;

public class AuthTests : ApiTestBase
{
    [Fact]
    public async Task Login_with_wrong_password_returns_401()
    {
        var (status, body) = await PostJsonAsync("/api/auth/login", new { username = "admin", password = "wrong" });
        Assert.Equal(HttpStatusCode.Unauthorized, status);
        Assert.Contains("Invalid username or password.", body);
    }

    [Fact]
    public async Task Login_with_wrong_username_returns_401()
    {
        var (status, _) = await PostJsonAsync("/api/auth/login", new { username = "someone", password = "test1234" });
        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }

    [Fact]
    public async Task Login_with_correct_credentials_returns_a_token()
    {
        var (status, body) = await PostJsonAsync("/api/auth/login", new { username = "admin", password = "test1234" });
        Assert.Equal(HttpStatusCode.OK, status);
        var json = JsonDocument.Parse(body).RootElement;
        Assert.Equal("admin", json.GetProperty("username").GetString());
        Assert.False(string.IsNullOrEmpty(json.GetProperty("token").GetString()));
    }

    [Fact]
    public async Task Get_rooms_without_a_token_returns_401()
    {
        var (status, _) = await GetAsync("/api/rooms");
        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }

    [Fact]
    public async Task Get_rooms_with_a_token_returns_200()
    {
        await AuthorizeAsync();
        var (status, _) = await GetAsync("/api/rooms");
        Assert.Equal(HttpStatusCode.OK, status);
    }

    [Fact]
    public async Task Tampered_token_returns_401()
    {
        var token = await AuthorizeAsync();
        Client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token + "x");
        var (status, _) = await GetAsync("/api/rooms");
        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }
}
