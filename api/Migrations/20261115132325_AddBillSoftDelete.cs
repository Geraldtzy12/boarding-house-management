using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BoardingHouse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBillSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bills_TenantId_Month_Type",
                table: "Bills");

            migrationBuilder.AddColumn<DateOnly>(
                name: "DeletedOn",
                table: "Bills",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Bills",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Bills_TenantId_Month_Type",
                table: "Bills",
                columns: new[] { "TenantId", "Month", "Type" },
                unique: true,
                filter: "\"IsDeleted\" = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bills_TenantId_Month_Type",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "DeletedOn",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Bills");

            migrationBuilder.CreateIndex(
                name: "IX_Bills_TenantId_Month_Type",
                table: "Bills",
                columns: new[] { "TenantId", "Month", "Type" },
                unique: true);
        }
    }
}
