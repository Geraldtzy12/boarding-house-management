using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BoardingHouse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomTypeAndImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Rooms",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Rooms",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Rooms");
        }
    }
}
