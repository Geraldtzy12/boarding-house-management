using Microsoft.AspNetCore.Identity;

namespace BoardingHouse.Api.Services;

/// <summary>
/// Single admin account for the boarding house owner.
/// The password is NOT stored in appsettings.json or git. Set it with:
///   dotnet user-secrets set "Admin:Password" "your-password"   (in the api folder)
/// or with the Admin__Password environment variable.
/// It is hashed in memory at startup and never stored anywhere.
/// </summary>
public class AdminAuthService
{
    private static readonly PasswordHasher<object> Hasher = new();

    private readonly string _username;
    private readonly string? _passwordHash;

    public AdminAuthService(IConfiguration config)
    {
        _username = config["Admin:Username"] ?? "admin";
        var plainPassword = config["Admin:Password"];
        _passwordHash = string.IsNullOrEmpty(plainPassword)
            ? null
            : Hasher.HashPassword(new object(), plainPassword);
    }

    public bool IsConfigured => _passwordHash is not null;

    public bool Validate(string? username, string? password)
    {
        if (_passwordHash is null) return false;
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrEmpty(password)) return false;
        if (!string.Equals(username.Trim(), _username, StringComparison.OrdinalIgnoreCase)) return false;
        return Hasher.VerifyHashedPassword(new object(), _passwordHash, password) == PasswordVerificationResult.Success;
    }
}
