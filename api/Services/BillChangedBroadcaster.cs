using BoardingHouse.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace BoardingHouse.Api.Services;

/// <summary>
/// Forwards bill-change events to every connected browser over SignalR.
/// Runs for the lifetime of the API; unsubscribes on shutdown.
/// </summary>
public class BillChangedBroadcaster : IHostedService
{
    private readonly BillEvents _events;
    private readonly IHubContext<BoardingHouseHub> _hub;
    private readonly ILogger<BillChangedBroadcaster> _logger;

    public BillChangedBroadcaster(
        BillEvents events,
        IHubContext<BoardingHouseHub> hub,
        ILogger<BillChangedBroadcaster> logger)
    {
        _events = events;
        _hub = hub;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _events.BillChanged += OnBillChanged;
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _events.BillChanged -= OnBillChanged;
        return Task.CompletedTask;
    }

    // async void is the normal shape for an event handler; the try/catch
    // keeps a failed push from taking the API down with it.
    private async void OnBillChanged(object? sender, BillChangedEventArgs args)
    {
        try
        {
            await _hub.Clients.All.SendAsync("billsChanged", new
            {
                billId = args.BillId,
                action = args.Action,
                tenantName = args.TenantName,
                amount = args.Amount,
                count = args.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to push the {Action} bill change to SignalR clients.", args.Action);
        }
    }
}
