using BoardingHouse.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BoardingHouse.Api.Tests;

/// <summary>
/// Boots the real API in memory for tests, with a fresh empty SQLite
/// database per factory and test login credentials (admin / test1234).
/// Nothing here touches the real boardinghouse.db.
///
/// NOTE: the test values are set as environment variables (not just
/// in-memory config) because Program.cs reads Jwt:Key / Jwt:Issuer /
/// Jwt:Audience once at startup — env vars are loaded before that
/// code runs, so signing and validation use the same test key.
/// </summary>
public class ApiTestFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;

    static ApiTestFactory()
    {
        // Set once per test run (same values every time, so re-setting is harmless).
        Environment.SetEnvironmentVariable("Admin__Username", "admin");
        Environment.SetEnvironmentVariable("Admin__Password", "test1234");
        Environment.SetEnvironmentVariable("Jwt__Key", "test-jwt-key-that-is-long-enough-1234567890");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "BoardingHouse");
        Environment.SetEnvironmentVariable("Jwt__Audience", "BoardingHouse");
        Environment.SetEnvironmentVariable("Jwt__ExpiresMinutes", "60");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Swap the real SQLite file for a fresh in-memory database.
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor is not null) services.Remove(descriptor);

            _connection = new SqliteConnection("Data Source=:memory:");
            _connection.Open();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _connection?.Dispose();
    }
}
