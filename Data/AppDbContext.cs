using BoardingHouse.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BoardingHouse.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Room> Rooms => Set<Room>();
}