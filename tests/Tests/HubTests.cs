using System.Net;
using System.Text.Json;

namespace BoardingHouse.Api.Tests;

/// <summary>
/// The SignalR hub answers negotiate requests: without a token it refuses
/// (401); with a token it hands out a connection id. A full SignalR client
/// conversation is covered by the live smoke test instead — the xUnit
/// project has no SignalR client package.
/// </summary>
public class HubTests : ApiTestBase
{
    [Fact]
    public async Task Negotiate_without_a_token_returns_401()
    {
        var (status, _) = await PostJsonAsync("/hubs/board/negotiate?negotiateVersion=1", new { });
        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }

    [Fact]
    public async Task Negotiate_with_a_token_returns_a_connection_id()
    {
        await AuthorizeAsync();
        var (status, body) = await PostJsonAsync("/hubs/board/negotiate?negotiateVersion=1", new { });
        Assert.Equal(HttpStatusCode.OK, status);
        Assert.False(string.IsNullOrEmpty(
            JsonDocument.Parse(body).RootElement.GetProperty("connectionId").GetString()));
    }
}
