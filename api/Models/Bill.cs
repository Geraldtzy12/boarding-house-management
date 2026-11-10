namespace BoardingHouse.Api.Models;

public enum BillStatus
{
    Pending,
    Paid,
    Overdue
}

public enum BillType
{
    Rent,
    Electricity,
    Water,
    Other
}

public class Bill
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public Tenant? Tenant { get; set; }
    public string RoomNo { get; set; } = string.Empty;   // kopya ng room no. nung ginawa ang bill
    public BillType Type { get; set; } = BillType.Rent;
    public string Month { get; set; } = string.Empty;    // 'yyyy-MM'
    public decimal Amount { get; set; }
    public DateOnly DueDate { get; set; }
    public BillStatus Status { get; set; } = BillStatus.Pending;
    public DateOnly? PaidOn { get; set; }
    public string? Note { get; set; }
}