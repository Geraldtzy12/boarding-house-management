using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BoardingHouse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBillTypeAndNote : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bills_TenantId_Month",
                table: "Bills");

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "Bills",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Bills",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Bills_TenantId_Month_Type",
                table: "Bills",
                columns: new[] { "TenantId", "Month", "Type" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bills_TenantId_Month_Type",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "Note",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Bills");

            migrationBuilder.CreateIndex(
                name: "IX_Bills_TenantId_Month",
                table: "Bills",
                columns: new[] { "TenantId", "Month" },
                unique: true);
        }
    }
}
