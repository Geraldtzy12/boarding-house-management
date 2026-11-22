namespace BoardingHouse.Api.Services;

/// <summary>
/// What changed about a bill, for the real-time push (Week 7: C# events).
/// </summary>
public class BillChangedEventArgs : EventArgs
{
    public required int BillId { get; init; }
    public required string Action { get; init; } // Created, Updated, Paid, Generated, Deleted, Restored, DeletedForever
    public required string TenantName { get; init; }
    public required decimal Amount { get; init; } // bill amount — or the amount just paid, for Paid
    public int Count { get; init; } // bills created, for Generated
}

/// <summary>
/// In-process publisher for bill changes. BillsController raises BillChanged
/// after every successful mutation; BillChangedBroadcaster forwards it to
/// SignalR. One publisher, one subscriber — the controller never knows
/// about hubs, and the hub never knows about bills.
/// </summary>
public class BillEvents
{
    public event EventHandler<BillChangedEventArgs>? BillChanged;

    public void Raise(BillChangedEventArgs args) => BillChanged?.Invoke(this, args);
}
