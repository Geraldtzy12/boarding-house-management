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

    public AuthController(AdminAuthService auth, IConfiguration config)
    {
        _auth = auth;
        _config = config;
    }

    public record LoginRequest(string? Username, string? Password);

    // POST /api/auth/login — public; everything else requires a token.
    [HttpPost("login")]
    [AllowAnonymous]
    public IActionResult Login(LoginRequest request)
    {
        if (!_auth.IsConfigured)
            return StatusCode(503, "Admin password is not set. Run: dotnet user-secrets set \"Admin:Password\" \"your-password\" (in the api folder), then restart the API.");

        if (!_auth.Validate(request.Username, request.Password))
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
}
