using System.Text;
using System.Text.Json.Serialization;
using BoardingHouse.Api.Data;
using BoardingHouse.Api.Models;
using BoardingHouse.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.FileProviders;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")));

// Single admin account (password from user-secrets or environment, never from git).
// Scoped, not singleton: the password hash lives in the database, so the
// service reads it through the scoped AppDbContext on each request.
builder.Services.AddScoped<AdminAuthService>();

// Login uses JWT. The signing key is a secret: set it with
//   dotnet user-secrets set "Jwt:Key" "<a long random string>"   (in the api folder)
// or with the Jwt__Key environment variable.
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrEmpty(jwtKey) || jwtKey.Length < 32)
    throw new InvalidOperationException(
        "Jwt:Key is not set (or too short). Run: dotnet user-secrets set \"Jwt:Key\" \"<a long random string>\" (in the api folder), then restart the API.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization();

// Payagan ang Angular (localhost:4200) na tumawag sa API
builder.Services.AddCors(options =>
{
    options.AddPolicy("Client", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

// Apply pending EF Core migrations on startup so a fresh clone
// (empty SQLite file, no tables yet) works without a manual
// `dotnet ef database update`.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    SeedAdminAccount(db, scope.ServiceProvider.GetRequiredService<IConfiguration>());
}

if (app.Environment.IsDevelopment())
{
    
    app.MapOpenApi();
    // Serve uploaded room photos from wwwroot/uploads (POST /api/rooms/{id}/image).
// The folder is created here so serving works even on a fresh clone,
// where wwwroot does not exist yet when the API first starts.
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

}

app.UseCors("Client");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers().RequireAuthorization();

app.Run();

// First run only: copy the password from user-secrets / environment into the
// database (hashed). Afterwards the Settings page owns the password —
// changing Admin:Password no longer changes the login password.
static void SeedAdminAccount(AppDbContext db, IConfiguration config)
{
    if (db.AdminAccounts.Any()) return;
    var password = config["Admin:Password"];
    if (string.IsNullOrEmpty(password)) return;
    db.AdminAccounts.Add(new AdminAccount
    {
        Id = 1,
        Username = config["Admin:Username"] ?? "admin",
        PasswordHash = new PasswordHasher<object>().HashPassword(new object(), password)
    });
    db.SaveChanges();
}

// Makes the top-level Program class visible to the API test project
// (WebApplicationFactory needs a public entry point).
public partial class Program { }
