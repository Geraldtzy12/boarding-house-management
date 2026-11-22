using System.Security.Cryptography;
using System.Text;
using BoardingHouse.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BoardingHouse.Api.Services;

/// <summary>
/// Single admin account for the boarding house owner.
/// The password hash lives in the AdminAccounts table (one row, Id = 1),
/// seeded once from Admin:Password (user-secrets or environment) when the
/// database is empty — see Program.cs. Changing the password in Settings
/// updates the row; the JWT signing key (Jwt:Key) still comes from
/// configuration only and is never stored in the database.
/// </summary>
public class AdminAuthService
{
    private static readonly PasswordHasher<object> Hasher = new();

    private readonly AppDbContext _db;

    public AdminAuthService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> IsConfiguredAsync() =>
        await _db.AdminAccounts.AnyAsync();

    public async Task<bool> ValidateAsync(string? username, string? password)
    {
        var account = await _db.AdminAccounts.FirstOrDefaultAsync();
        if (account is null) return false;
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrEmpty(password)) return false;
        if (!string.Equals(username.Trim(), account.Username, StringComparison.OrdinalIgnoreCase)) return false;
        return Hasher.VerifyHashedPassword(new object(), account.PasswordHash, password)
            == PasswordVerificationResult.Success;
    }

    /// <summary>
    /// Changes the admin password. Returns false when the current password
    /// is wrong (the stored hash is left untouched).
    /// </summary>
    public async Task<bool> ChangePasswordAsync(string username, string currentPassword, string newPassword)
    {
        var account = await _db.AdminAccounts.FirstOrDefaultAsync();
        if (account is null) return false;
        if (!string.Equals(username, account.Username, StringComparison.OrdinalIgnoreCase)) return false;
        if (Hasher.VerifyHashedPassword(new object(), account.PasswordHash, currentPassword)
            != PasswordVerificationResult.Success) return false;

        account.PasswordHash = Hasher.HashPassword(new object(), newPassword);
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Creates a 6-digit reset code for the admin. The code itself is returned
    /// so the caller can deliver it (the API console); only its SHA-256 hash
    /// is stored, valid for 15 minutes. Returns null when the username does
    /// not match the admin (the caller must not reveal that).
    /// </summary>
    public async Task<string?> RequestPasswordResetAsync(string? username)
    {
        var account = await _db.AdminAccounts.FirstOrDefaultAsync();
        if (account is null) return null;
        if (string.IsNullOrWhiteSpace(username)
            || !string.Equals(username.Trim(), account.Username, StringComparison.OrdinalIgnoreCase)) return null;

        var code = Random.Shared.Next(0, 1_000_000).ToString("D6");
        account.ResetCodeHash = Sha256(code);
        account.ResetCodeExpiresAt = DateTime.UtcNow.AddMinutes(15);
        await _db.SaveChangesAsync();
        return code;
    }

    /// <summary>
    /// Resets the password with a code from RequestPasswordResetAsync.
    /// Returns false when the code is wrong, expired, or was never requested.
    /// A used code is cleared so it cannot be replayed.
    /// </summary>
    public async Task<bool> ResetPasswordAsync(string? username, string? code, string newPassword)
    {
        var account = await _db.AdminAccounts.FirstOrDefaultAsync();
        if (account is null) return false;
        if (string.IsNullOrWhiteSpace(username)
            || !string.Equals(username.Trim(), account.Username, StringComparison.OrdinalIgnoreCase)) return false;
        if (account.ResetCodeHash is null || account.ResetCodeExpiresAt is null
            || account.ResetCodeExpiresAt < DateTime.UtcNow) return false;
        if (string.IsNullOrEmpty(code)
            || !string.Equals(Sha256(code), account.ResetCodeHash, StringComparison.Ordinal)) return false;

        account.PasswordHash = Hasher.HashPassword(new object(), newPassword);
        account.ResetCodeHash = null;
        account.ResetCodeExpiresAt = null;
        await _db.SaveChangesAsync();
        return true;
    }

    private static string Sha256(string input) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input)));
}
