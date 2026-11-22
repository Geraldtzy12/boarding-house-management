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

    [Fact]
    public async Task Change_password_with_wrong_current_password_returns_401()
    {
        await AuthorizeAsync();
        var (status, body) = await PostJsonAsync("/api/auth/change-password",
            new { currentPassword = "wrong", newPassword = "newpass123" });
        Assert.Equal(HttpStatusCode.Unauthorized, status);
        Assert.Contains("current password is incorrect", body);
    }

    [Fact]
    public async Task Change_password_with_short_new_password_returns_400()
    {
        await AuthorizeAsync();
        var (status, _) = await PostJsonAsync("/api/auth/change-password",
            new { currentPassword = "test1234", newPassword = "short" });
        Assert.Equal(HttpStatusCode.BadRequest, status);
    }

    [Fact]
    public async Task Change_password_with_same_password_returns_400()
    {
        await AuthorizeAsync();
        var (status, _) = await PostJsonAsync("/api/auth/change-password",
            new { currentPassword = "test1234", newPassword = "test1234" });
        Assert.Equal(HttpStatusCode.BadRequest, status);
    }

    [Fact]
    public async Task Change_password_without_a_token_returns_401()
    {
        var (status, _) = await PostJsonAsync("/api/auth/change-password",
            new { currentPassword = "test1234", newPassword = "newpass123" });
        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }

    [Fact]
    public async Task Change_password_then_login_with_the_new_password_works()
    {
        await AuthorizeAsync();
        var (status, _) = await PostJsonAsync("/api/auth/change-password",
            new { currentPassword = "test1234", newPassword = "newpass123" });
        Assert.Equal(HttpStatusCode.NoContent, status);

        // The old password no longer works.
        var (oldStatus, _) = await PostJsonAsync("/api/auth/login",
            new { username = "admin", password = "test1234" });
        Assert.Equal(HttpStatusCode.Unauthorized, oldStatus);

        // The new password works.
        var (newStatus, body) = await PostJsonAsync("/api/auth/login",
            new { username = "admin", password = "newpass123" });
        Assert.Equal(HttpStatusCode.OK, newStatus);
        Assert.False(string.IsNullOrEmpty(
            JsonDocument.Parse(body).RootElement.GetProperty("token").GetString()));
    }

    [Fact]
    public async Task Forgot_password_for_unknown_user_still_returns_200()
    {
        // The response never says whether the username exists.
        var (status, _) = await PostJsonAsync("/api/auth/forgot-password", new { username = "someone" });
        Assert.Equal(HttpStatusCode.OK, status);
    }

    [Fact]
    public async Task Reset_password_without_a_code_returns_400()
    {
        var (status, _) = await PostJsonAsync("/api/auth/reset-password",
            new { username = "admin", code = "123456", newPassword = "newpass123" });
        Assert.Equal(HttpStatusCode.BadRequest, status);
    }

    [Fact]
    public async Task Reset_password_with_wrong_code_returns_400()
    {
        // Request a real code first (it goes to the API console, not the
        // response), then reset with a code that can never match:
        // generated codes are 6 digits, "abcdef" is not.
        await PostJsonAsync("/api/auth/forgot-password", new { username = "admin" });
        var (status, body) = await PostJsonAsync("/api/auth/reset-password",
            new { username = "admin", code = "abcdef", newPassword = "newpass123" });
        Assert.Equal(HttpStatusCode.BadRequest, status);
        Assert.Contains("invalid or expired", body);
    }

    [Fact]
    public async Task Reset_password_with_short_new_password_returns_400()
    {
        await PostJsonAsync("/api/auth/forgot-password", new { username = "admin" });
        var (status, _) = await PostJsonAsync("/api/auth/reset-password",
            new { username = "admin", code = "abcdef", newPassword = "short" });
        Assert.Equal(HttpStatusCode.BadRequest, status);
    }
}
