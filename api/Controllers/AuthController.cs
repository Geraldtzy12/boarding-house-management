using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BoardingHouse.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace BoardingHouse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AdminAuthService _auth;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AdminAuthService auth, IConfiguration config, ILogger<AuthController> logger)
    {
        _auth = auth;
        _config = config;
        _logger = logger;
    }

    public record LoginRequest(string? Username, string? Password);

    // POST /api/auth/login — public; everything else requires a token.
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        if (!await _auth.IsConfiguredAsync())
            return StatusCode(503, "Admin password is not set. Run: dotnet user-secrets set \"Admin:Password\" \"your-password\" (in the api folder), then restart the API.");

        if (!await _auth.ValidateAsync(request.Username, request.Password))
            return Unauthorized("Invalid username or password.");

        var jwt = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddMinutes(
            int.TryParse(jwt["ExpiresMinutes"], out var minutes) ? minutes : 720);

        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: new[] { new Claim(ClaimTypes.Name, request.Username!.Trim()) },
            expires: expires,
            signingCredentials: credentials);

        return Ok(new
        {
            token = new JwtSecurityTokenHandler().WriteToken(token),
            username = request.Username!.Trim()
        });
    }

    public record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);

    // POST /api/auth/change-password — logged-in admin only.
    // The new password must be at least 6 characters and different
    // from the current one.
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrWhiteSpace(username)) return Unauthorized();

        if (string.IsNullOrEmpty(request.NewPassword) || request.NewPassword.Length < 6)
            return BadRequest("The new password must be at least 6 characters.");
        if (request.NewPassword == request.CurrentPassword)
            return BadRequest("The new password must be different from the current password.");
        if (!await _auth.ChangePasswordAsync(username, request.CurrentPassword ?? "", request.NewPassword))
            return Unauthorized("The current password is incorrect.");
        return NoContent();
    }

    public record ForgotPasswordRequest(string? Username);

    // POST /api/auth/forgot-password — public.
    // No email server in this system, so the 6-digit reset code is printed
    // to the API console (the terminal window where the API is running) —
    // only the person running the server can read it. The response never
    // says whether the username exists.
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var code = await _auth.RequestPasswordResetAsync(request.Username);
        if (code is not null)
            _logger.LogInformation("Password reset code for {Username}: {Code} (valid for 15 minutes)",
                request.Username!.Trim(), code);
        return Ok(new { message = "If the username exists, a reset code was printed to the API console. It is valid for 15 minutes." });
    }

    public record ResetPasswordRequest(string? Username, string? Code, string? NewPassword);

    // POST /api/auth/reset-password — public. One use: the code is cleared
    // after a successful reset, so it cannot be replayed.
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        if (string.IsNullOrEmpty(request.NewPassword) || request.NewPassword.Length < 6)
            return BadRequest("The new password must be at least 6 characters.");
        if (!await _auth.ResetPasswordAsync(request.Username, request.Code, request.NewPassword))
            return BadRequest("The reset code is invalid or expired.");
        return NoContent();
    }
}
