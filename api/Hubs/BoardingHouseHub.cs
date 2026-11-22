using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BoardingHouse.Api.Hubs;

/// <summary>
/// Real-time push channel (Week 9: SignalR). Browsers connect here after
/// logging in (JWT in the access_token query string) and listen for
/// "billsChanged" — the API sends it whenever a bill is created, edited,
/// paid, generated, deleted or restored, so the Dashboard updates without
/// a manual refresh. The hub itself takes no calls from clients.
/// </summary>
[Authorize]
public class BoardingHouseHub : Hub
{
}
