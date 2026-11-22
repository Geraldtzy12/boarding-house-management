namespace BoardingHouse.Api.Models;

/// <summary>
/// The single admin account (Id is always 1). The password hash lives here
/// so it can be changed from the Settings page. The password in user-secrets
/// (Admin:Password) is only the seed for a fresh database: once this row
/// exists, changing user-secrets does NOT change the login password.
/// ResetCodeHash holds the SHA-256 of the 6-digit forgot-password code
/// (never the code itself), valid until ResetCodeExpiresAt — used by the
/// forgot-password flow.
/// </summary>
public class AdminAccount
{
    public int Id { get; set; }
    public string Username { get; set; } = "admin";
    public string PasswordHash { get; set; } = "";
    public string? ResetCodeHash { get; set; }
    public DateTime? ResetCodeExpiresAt { get; set; }
}
